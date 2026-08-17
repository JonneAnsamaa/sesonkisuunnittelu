import { readFileSync, writeFileSync, existsSync } from 'fs';

const input = JSON.parse(readFileSync('data/input.json', 'utf-8'));
const roomsData = JSON.parse(readFileSync('data/rooms.json', 'utf-8'));
const constraints = existsSync('data/constraints.json')
  ? JSON.parse(readFileSync('data/constraints.json', 'utf-8'))
  : [];
const preferences = existsSync('data/preferences.json')
  ? JSON.parse(readFileSync('data/preferences.json', 'utf-8'))
  : [];

const { config, rooms } = roomsData;
const { sessions } = input;

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function buildTimeSlots() {
  const dayStart = timeToMinutes(config.dayStartTime);
  const dayEnd = timeToMinutes(config.dayEndTime);
  const lunchStart = timeToMinutes(config.lunchStart);
  const lunchEnd = timeToMinutes(config.lunchEnd);
  const granularity = config.slotGranularity;

  const slots = [];
  for (let t = dayStart; t < dayEnd; t += granularity) {
    if (t >= lunchStart && t < lunchEnd) continue;
    slots.push(t);
  }
  return slots;
}

function canFitSession(startSlot, duration, daySlots) {
  const endTime = startSlot + duration;
  const lunchStart = timeToMinutes(config.lunchStart);
  const lunchEnd = timeToMinutes(config.lunchEnd);
  const dayEnd = timeToMinutes(config.dayEndTime);

  if (endTime > dayEnd) return false;
  if (startSlot >= lunchStart && startSlot < lunchEnd) return false;
  if (startSlot < lunchStart && endTime > lunchStart) return false;

  return true;
}

function getAvailabilityConflicts(session, startTime, endTime, day) {
  const conflicts = [];
  for (const p of session.participants) {
    for (const c of constraints) {
      if (c.person !== p.name || c.day !== day) continue;
      const cStart = timeToMinutes(c.startTime);
      const cEnd = timeToMinutes(c.endTime);
      if (startTime < cEnd && endTime > cStart) {
        conflicts.push({
          person: p.name,
          domain: p.domain,
          requiredInThis: p.required,
          type: 'availability',
          reason: c.reason || 'Ei käytettävissä',
          constraintStart: c.startTime,
          constraintEnd: c.endTime,
        });
      }
    }
  }
  return conflicts;
}

function getPersonConflicts(session, startTime, endTime, day, schedule) {
  const sessionEnd = endTime;
  const conflicts = [];

  for (const scheduled of schedule) {
    if (scheduled.day !== day) continue;

    const schedStart = timeToMinutes(scheduled.startTime);
    const schedEnd = timeToMinutes(scheduled.endTime);

    if (startTime < schedEnd && sessionEnd > schedStart) {
      const scheduledSession = sessions.find((s) => s.id === scheduled.id);
      if (!scheduledSession) continue;

      for (const participant of session.participants) {
        const inOther = scheduledSession.participants.some(
          (p) => p.name === participant.name
        );
        if (inOther) {
          conflicts.push({
            person: participant.name,
            domain: participant.domain,
            requiredInThis: participant.required,
            requiredInOther: scheduledSession.participants.find(
              (p) => p.name === participant.name
            )?.required,
            type: 'overlap',
            otherSessionId: scheduled.id,
            otherSessionTopic: scheduledSession.topic,
          });
        }
      }
    }
  }

  return conflicts;
}

function selectRoom(session, startTime, endTime, day, schedule) {
  const participantCount = session.participants.length;

  const dayRooms = rooms.filter(r => !r.availableDays || r.availableDays.includes(day));
  const sortedRooms = [...dayRooms].sort((a, b) => b.capacity - a.capacity);

  for (const room of sortedRooms) {
    if (room.capacity < participantCount) continue;

    const roomFree = !schedule.some(
      (s) =>
        s.day === day &&
        s.room === room.id &&
        timeToMinutes(s.startTime) < endTime &&
        timeToMinutes(s.endTime) > startTime
    );

    if (roomFree) return room;
  }

  for (const room of sortedRooms) {
    const roomFree = !schedule.some(
      (s) =>
        s.day === day &&
        s.room === room.id &&
        timeToMinutes(s.startTime) < endTime &&
        timeToMinutes(s.endTime) > startTime
    );
    if (roomFree) return room;
  }

  return null;
}

function sortSessions(sessions) {
  return [...sessions].sort((a, b) => {
    const aRequired = a.participants.filter((p) => p.required).length;
    const bRequired = b.participants.filter((p) => p.required).length;
    if (bRequired !== aRequired) return bRequired - aRequired;

    const aTotal = a.participants.length;
    const bTotal = b.participants.length;
    if (bTotal !== aTotal) return bTotal - aTotal;

    return a.priority - b.priority;
  });
}

function schedule() {
  const sorted = sortSessions(sessions);
  const timeSlots = buildTimeSlots();
  const scheduled = [];
  const allConflicts = [];
  const breakTime = config.breakBetweenSessions;

  for (const session of sorted) {
    let bestPlacement = null;
    let bestConflictScore = Infinity;

    for (let day = 1; day <= config.days.length; day++) {
      for (const slotStart of timeSlots) {
        const endTime = slotStart + session.duration;

        if (!canFitSession(slotStart, session.duration, timeSlots)) continue;

        const availConflicts = getAvailabilityConflicts(session, slotStart, endTime, day);
        if (availConflicts.some(c => c.requiredInThis)) continue;

        const overlapConflicts = getPersonConflicts(
          session,
          slotStart,
          endTime,
          day,
          scheduled
        );

        const allConflictsForSlot = [...availConflicts, ...overlapConflicts];
        const requiredOverlaps = overlapConflicts.filter((c) => c.requiredInThis).length;
        const optionalConflicts = allConflictsForSlot.filter((c) => !c.requiredInThis).length;
        let prefPenalty = 0;
        for (const p of session.participants) {
          const pref = preferences.find(pr => pr.person === p.name && pr.type === 'prefer-day');
          if (pref && !pref.days.includes(day)) prefPenalty++;
        }
        const conflictScore = requiredOverlaps * 1000 + optionalConflicts + prefPenalty * 0.3;

        const room = selectRoom(session, slotStart, endTime, day, scheduled);
        if (!room) continue;

        if (conflictScore < bestConflictScore) {
          bestConflictScore = conflictScore;
          bestPlacement = {
            day,
            startTime: minutesToTime(slotStart),
            endTime: minutesToTime(endTime),
            room: room.id,
            roomName: room.name,
            conflicts: allConflictsForSlot,
          };
        }

        if (conflictScore === 0) break;
      }
      if (bestPlacement && bestConflictScore === 0) break;
    }

    if (bestPlacement) {
      scheduled.push({
        id: session.id,
        topic: session.topic,
        owner: session.owner,
        ownerDomain: session.ownerDomain,
        day: bestPlacement.day,
        startTime: bestPlacement.startTime,
        endTime: bestPlacement.endTime,
        room: bestPlacement.room,
        roomName: bestPlacement.roomName,
        participantCount: session.participants.length,
        conflicts: bestPlacement.conflicts,
      });

      if (bestPlacement.conflicts.length > 0) {
        allConflicts.push({
          sessionId: session.id,
          sessionTopic: session.topic,
          conflicts: bestPlacement.conflicts,
        });
      }
    } else {
      console.error(`EI VOITU SIJOITTAA: "${session.topic}" (${session.id})`);
    }
  }

  return { scheduled, allConflicts };
}

const result = schedule();

writeFileSync(
  'data/schedule.json',
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      season: input.season,
      config,
      rooms,
      sessions: input.sessions,
      schedule: result.scheduled,
      conflicts: result.allConflicts,
    },
    null,
    2
  ),
  'utf-8'
);

console.log(`Aikataulutettu ${result.scheduled.length}/${sessions.length} sessiota`);
if (result.allConflicts.length > 0) {
  console.log(`\nPÄÄLLEKKÄISYYDET (${result.allConflicts.length} sessiossa):`);
  for (const c of result.allConflicts) {
    console.log(`  ${c.sessionTopic}:`);
    for (const conflict of c.conflicts) {
      const req = conflict.requiredInThis ? 'PAKOLLINEN' : 'toivottu';
      console.log(`    - ${conflict.person} (${conflict.domain}, ${req}) päällekkäin: "${conflict.otherSessionTopic}"`);
    }
  }
}
