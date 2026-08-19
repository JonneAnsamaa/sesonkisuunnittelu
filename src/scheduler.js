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

const prevSchedule = existsSync('data/schedule.json')
  ? JSON.parse(readFileSync('data/schedule.json', 'utf-8'))
  : null;

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
          const ownerNames = (n) => n.split(/[+&\/]/).map(x=>x.trim());
          const isOwnerInThis = ownerNames(session.owner).includes(participant.name);
          const isOwnerInOther = ownerNames(scheduledSession.owner).includes(participant.name);
          conflicts.push({
            person: participant.name,
            domain: participant.domain,
            requiredInThis: participant.required,
            requiredInOther: scheduledSession.participants.find(
              (p) => p.name === participant.name
            )?.required,
            isOwnerInThis,
            isOwnerInOther,
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
  const af = config.activeFloors;
  const allDayRooms = rooms.filter(r => !r.availableDays || r.availableDays.includes(day));

  const isRoomFree = (room) => !schedule.some(s =>
    s.day === day && s.room === room.id &&
    timeToMinutes(s.startTime) < endTime && timeToMinutes(s.endTime) > startTime
  );

  const primaryRooms = allDayRooms.filter(r => af && af.length ? af.includes(r.floor) : true).sort((a, b) => b.capacity - a.capacity);
  for (const room of primaryRooms) {
    if (room.capacity < participantCount) continue;
    if (isRoomFree(room)) return room;
  }
  for (const room of primaryRooms) {
    if (isRoomFree(room)) return room;
  }

  const sr = config.secondaryRoomIds || [];
  const secondaryRooms = sr.length
    ? allDayRooms.filter(r => sr.includes(r.id)).sort((a, b) => b.capacity - a.capacity)
    : allDayRooms.filter(r => af && af.length ? !af.includes(r.floor) : false).sort((a, b) => b.capacity - a.capacity);
  for (const room of secondaryRooms) {
    if (room.capacity < participantCount) continue;
    if (isRoomFree(room)) return room;
  }
  for (const room of secondaryRooms) {
    if (isRoomFree(room)) return room;
  }

  return null;
}

function sortSessions(sessions) {
  const personLoad = {};
  for (const s of sessions) {
    if (s.status === 'cancelled') continue;
    for (const p of s.participants) {
      if (p.required) personLoad[p.name] = (personLoad[p.name] || 0) + 1;
    }
  }

  return [...sessions].sort((a, b) => {
    const aInt = a.status === 'internal' ? 1 : 0;
    const bInt = b.status === 'internal' ? 1 : 0;
    if (aInt !== bInt) return aInt - bInt;

    const aMaxLoad = Math.max(0, ...a.participants.filter(p => p.required).map(p => personLoad[p.name] || 0));
    const bMaxLoad = Math.max(0, ...b.participants.filter(p => p.required).map(p => personLoad[p.name] || 0));
    if (bMaxLoad !== aMaxLoad) return bMaxLoad - aMaxLoad;

    const aRequired = a.participants.filter((p) => p.required).length;
    const bRequired = b.participants.filter((p) => p.required).length;
    if (bRequired !== aRequired) return bRequired - aRequired;

    const aTotal = a.participants.length;
    const bTotal = b.participants.length;
    if (bTotal !== aTotal) return bTotal - aTotal;

    return a.priority - b.priority;
  });
}

function computeGroupPlacements(group, startSlot) {
  const lunchStart = timeToMinutes(config.lunchStart);
  const lunchEnd = timeToMinutes(config.lunchEnd);
  const dayEnd = timeToMinutes(config.dayEndTime);

  const placements = [];
  let currentTime = startSlot;

  for (const gs of group) {
    if (currentTime >= lunchStart && currentTime < lunchEnd) {
      currentTime = lunchEnd;
    }
    let endTime = currentTime + gs.duration;
    if (currentTime < lunchStart && endTime > lunchStart) {
      currentTime = lunchEnd;
      endTime = currentTime + gs.duration;
    }
    if (endTime > dayEnd) return null;
    placements.push({ session: gs, startTime: currentTime, endTime });
    currentTime = endTime;
  }

  return placements;
}

function selectRoomForGroup(placements, day, scheduled) {
  const maxParticipants = Math.max(...placements.map(p => p.session.participants.length));
  const af = config.activeFloors;
  const allDayRooms = rooms.filter(r => !r.availableDays || r.availableDays.includes(day));

  const isGroupFree = (room) => placements.every(p =>
    !scheduled.some(s =>
      s.day === day && s.room === room.id &&
      timeToMinutes(s.startTime) < p.endTime && timeToMinutes(s.endTime) > p.startTime
    )
  );

  const primaryRooms = allDayRooms.filter(r => af && af.length ? af.includes(r.floor) : true).sort((a, b) => b.capacity - a.capacity);
  for (const room of primaryRooms) {
    if (room.capacity < maxParticipants) continue;
    if (isGroupFree(room)) return room;
  }
  for (const room of primaryRooms) {
    if (isGroupFree(room)) return room;
  }

  const sr = config.secondaryRoomIds || [];
  const secondaryRooms = sr.length
    ? allDayRooms.filter(r => sr.includes(r.id)).sort((a, b) => b.capacity - a.capacity)
    : allDayRooms.filter(r => af && af.length ? !af.includes(r.floor) : false).sort((a, b) => b.capacity - a.capacity);
  for (const room of secondaryRooms) {
    if (room.capacity < maxParticipants) continue;
    if (isGroupFree(room)) return room;
  }
  for (const room of secondaryRooms) {
    if (isGroupFree(room)) return room;
  }

  return null;
}

function scheduleWithOrder(sorted, active) {
  const timeSlots = buildTimeSlots();
  const scheduled = [];
  const allConflicts = [];
  const scheduledIds = new Set();

  // Pre-place locked sessions from previous schedule
  if (prevSchedule && prevSchedule.schedule) {
    for (const prev of prevSchedule.schedule) {
      const session = active.find(s => s.id === prev.id);
      if (!session || !session.locked) continue;
      const startTime = timeToMinutes(prev.startTime);
      const endTime = timeToMinutes(prev.endTime);
      const availConflicts = getAvailabilityConflicts(session, startTime, endTime, prev.day);
      const overlapConflicts = getPersonConflicts(session, startTime, endTime, prev.day, scheduled);
      const allC = [...availConflicts, ...overlapConflicts];
      scheduled.push({
        id: session.id,
        topic: session.topic,
        owner: session.owner,
        ownerDomain: session.ownerDomain,
        day: prev.day,
        startTime: prev.startTime,
        endTime: prev.endTime,
        room: prev.room,
        roomName: prev.roomName,
        participantCount: session.participants.length,
        conflicts: allC,
        locked: true,
      });
      scheduledIds.add(session.id);
      if (allC.length > 0) {
        allConflicts.push({ sessionId: session.id, sessionTopic: session.topic, conflicts: allC });
      }
    }
    if (scheduledIds.size > 0) {
      console.log(`Lukittu ${scheduledIds.size} sessiota edellisestä aikataulusta`);
    }
  }

  const groups = {};
  for (const s of active) {
    if (s.group) {
      if (!groups[s.group]) groups[s.group] = [];
      groups[s.group].push(s);
    }
  }
  for (const g of Object.values(groups)) {
    g.sort((a, b) => (a.groupOrder || 0) - (b.groupOrder || 0));
  }

  for (const session of sorted) {
    if (scheduledIds.has(session.id)) continue;

    if (session.group && groups[session.group]) {
      const group = groups[session.group];
      let bestPlacement = null;
      let bestConflictScore = Infinity;

      for (let day = 1; day <= config.days.length; day++) {
        for (const slotStart of timeSlots) {
          const placements = computeGroupPlacements(group, slotStart);
          if (!placements) continue;

          let hasBlocker = false;
          for (const p of placements) {
            const ac = getAvailabilityConflicts(p.session, p.startTime, p.endTime, day);
            if (ac.some(c => c.requiredInThis)) { hasBlocker = true; break; }
            const oc = getPersonConflicts(p.session, p.startTime, p.endTime, day, scheduled);
            p.conflicts = [...ac, ...oc];
          }
          if (hasBlocker) continue;

          const room = selectRoomForGroup(placements, day, scheduled);
          if (!room) continue;

          const totalConflicts = placements.flatMap(p => p.conflicts);
          const score = totalConflicts.filter(c => c.isOwnerInThis || c.isOwnerInOther).length * 10000
                      + totalConflicts.filter(c => c.requiredInThis).length * 1000
                      + totalConflicts.filter(c => !c.requiredInThis).length;

          if (score < bestConflictScore) {
            bestConflictScore = score;
            bestPlacement = { day, room, placements };
          }
          if (score === 0) break;
        }
        if (bestPlacement && bestConflictScore === 0) break;
      }

      if (bestPlacement) {
        for (const p of bestPlacement.placements) {
          scheduled.push({
            id: p.session.id,
            topic: p.session.topic,
            owner: p.session.owner,
            ownerDomain: p.session.ownerDomain,
            day: bestPlacement.day,
            startTime: minutesToTime(p.startTime),
            endTime: minutesToTime(p.endTime),
            room: bestPlacement.room.id,
            roomName: bestPlacement.room.name,
            participantCount: p.session.participants.length,
            conflicts: p.conflicts,
            group: p.session.group,
          });
          scheduledIds.add(p.session.id);
          if (p.conflicts.length > 0) {
            allConflicts.push({
              sessionId: p.session.id,
              sessionTopic: p.session.topic,
              conflicts: p.conflicts,
            });
          }
        }
      } else {
        for (const gs of group) {
          scheduledIds.add(gs.id);
        }
      }
    } else {
      let bestPlacement = null;
      let bestConflictScore = Infinity;

      for (let day = 1; day <= config.days.length; day++) {
        for (const slotStart of timeSlots) {
          const endTime = slotStart + session.duration;

          if (!canFitSession(slotStart, session.duration, timeSlots)) continue;

          const availConflicts = getAvailabilityConflicts(session, slotStart, endTime, day);
          if (availConflicts.some(c => c.requiredInThis)) continue;

          const overlapConflicts = getPersonConflicts(session, slotStart, endTime, day, scheduled);

          const allConflictsForSlot = [...availConflicts, ...overlapConflicts];
          const ownerOverlaps = overlapConflicts.filter(c => c.isOwnerInThis || c.isOwnerInOther).length;
          const requiredOverlaps = overlapConflicts.filter((c) => c.requiredInThis).length;
          const optionalConflicts = allConflictsForSlot.filter((c) => !c.requiredInThis).length;
          let prefPenalty = 0;
          for (const p of session.participants) {
            const pref = preferences.find(pr => pr.person === p.name && pr.type === 'prefer-day');
            if (pref && !pref.days.includes(day)) prefPenalty++;
          }
          // Session-level time preferences
          const sesPrefs = preferences.filter(pr => pr.type === 'prefer-session-time' && pr.sessionId === session.id);
          let hardBlock = false;
          for (const sp of sesPrefs) {
            const matchDay = sp.days.includes(day);
            const prefStart = sp.startTime ? timeToMinutes(sp.startTime) : null;
            const prefEnd = sp.endTime ? timeToMinutes(sp.endTime) : null;
            const timeOk = (prefStart === null || slotStart >= prefStart) && (prefEnd === null || endTime <= prefEnd);
            const fits = matchDay && timeOk;
            if (sp.hard && !fits) { hardBlock = true; break; }
            if (!fits) prefPenalty += 5;
          }
          if (hardBlock) continue;
          const conflictScore = ownerOverlaps * 10000 + requiredOverlaps * 1000 + optionalConflicts + prefPenalty * 100;

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
      }
    }
  }

  const totalConflictCount = allConflicts.reduce((sum, c) => sum + c.conflicts.length, 0);
  const requiredConflictCount = allConflicts.reduce((sum, c) => sum + c.conflicts.filter(x => x.requiredInThis).length, 0);
  return { scheduled, allConflicts, totalConflictCount, requiredConflictCount };
}

function schedule() {
  const active = sessions.filter(s => s.status !== 'cancelled');
  const baseSort = sortSessions(active);

  const strategies = [baseSort];

  // Strategy: prioritize by duration (longest first)
  strategies.push([...active].sort((a, b) => {
    const aInt = a.status === 'internal' ? 1 : 0;
    const bInt = b.status === 'internal' ? 1 : 0;
    if (aInt !== bInt) return aInt - bInt;
    return b.duration - a.duration || a.priority - b.priority;
  }));

  // Strategy: prioritize by priority number
  strategies.push([...active].sort((a, b) => {
    const aInt = a.status === 'internal' ? 1 : 0;
    const bInt = b.status === 'internal' ? 1 : 0;
    if (aInt !== bInt) return aInt - bInt;
    return a.priority - b.priority || b.participants.length - a.participants.length;
  }));

  // Strategy: most constrained person first (sum of all required participant loads)
  const personLoad = {};
  for (const s of active) {
    if (s.status === 'cancelled') continue;
    for (const p of s.participants) {
      if (p.required) personLoad[p.name] = (personLoad[p.name] || 0) + 1;
    }
  }
  strategies.push([...active].sort((a, b) => {
    const aInt = a.status === 'internal' ? 1 : 0;
    const bInt = b.status === 'internal' ? 1 : 0;
    if (aInt !== bInt) return aInt - bInt;
    const aLoad = a.participants.filter(p => p.required).reduce((s, p) => s + (personLoad[p.name] || 0), 0);
    const bLoad = b.participants.filter(p => p.required).reduce((s, p) => s + (personLoad[p.name] || 0), 0);
    return bLoad - aLoad || a.priority - b.priority;
  }));

  // Strategy: reverse day search (start from day 3)
  const reversed = [...baseSort].reverse();
  const internals = reversed.filter(s => s.status === 'internal');
  const nonInternals = reversed.filter(s => s.status !== 'internal');
  strategies.push([...nonInternals, ...internals]);

  // Strategy: busiest person first (total minutes, not session count)
  const personMinutes = {};
  for (const s of active) {
    if (s.status === 'cancelled') continue;
    for (const p of s.participants) {
      if (p.required) personMinutes[p.name] = (personMinutes[p.name] || 0) + s.duration;
    }
  }
  strategies.push([...active].sort((a, b) => {
    const aInt = a.status === 'internal' ? 1 : 0;
    const bInt = b.status === 'internal' ? 1 : 0;
    if (aInt !== bInt) return aInt - bInt;
    const aLoad = Math.max(...a.participants.filter(p => p.required).map(p => personMinutes[p.name] || 0), 0);
    const bLoad = Math.max(...b.participants.filter(p => p.required).map(p => personMinutes[p.name] || 0), 0);
    return bLoad - aLoad || b.duration - a.duration;
  }));

  // Strategy: longest sessions first, then busiest person
  strategies.push([...active].sort((a, b) => {
    const aInt = a.status === 'internal' ? 1 : 0;
    const bInt = b.status === 'internal' ? 1 : 0;
    if (aInt !== bInt) return aInt - bInt;
    if (b.duration !== a.duration) return b.duration - a.duration;
    const aLoad = Math.max(...a.participants.filter(p => p.required).map(p => personMinutes[p.name] || 0), 0);
    const bLoad = Math.max(...b.participants.filter(p => p.required).map(p => personMinutes[p.name] || 0), 0);
    return bLoad - aLoad;
  }));

  // Strategy: most participants first
  strategies.push([...active].sort((a, b) => {
    const aInt = a.status === 'internal' ? 1 : 0;
    const bInt = b.status === 'internal' ? 1 : 0;
    if (aInt !== bInt) return aInt - bInt;
    return b.participants.length - a.participants.length || b.duration - a.duration;
  }));

  // Strategy: combined score (participants × duration × busiest person load)
  strategies.push([...active].sort((a, b) => {
    const aInt = a.status === 'internal' ? 1 : 0;
    const bInt = b.status === 'internal' ? 1 : 0;
    if (aInt !== bInt) return aInt - bInt;
    const aScore = a.participants.length * a.duration * Math.max(...a.participants.filter(p => p.required).map(p => personLoad[p.name] || 0), 1);
    const bScore = b.participants.length * b.duration * Math.max(...b.participants.filter(p => p.required).map(p => personLoad[p.name] || 0), 1);
    return bScore - aScore;
  }));

  let best = null;
  for (let i = 0; i < strategies.length; i++) {
    const result = scheduleWithOrder(strategies[i], active);
    const score = result.requiredConflictCount * 1000 + result.totalConflictCount;
    if (!best || score < best.score) {
      best = { result, score, strategyIndex: i };
    }
  }

  console.log(`Paras strategia: #${best.strategyIndex} (${best.result.requiredConflictCount} pakollista, ${best.result.totalConflictCount} yhteensä)`);
  return best.result;
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
