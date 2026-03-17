# Maths Arcade Bridge API

This document describes the browser `postMessage` contract between HomeSchool Hub and a Maths Arcade game window.

## Allowed origins

The LMS accepts Arcade messages only from origins listed in `STATE.arcadeOrigins`.

Default allowed origins:

- current app origin
- `http://127.0.0.1:8080`
- `http://localhost:8080`

## Session flow

1. LMS opens an Arcade game window.
2. LMS sends `HS_INIT` to the game's allowed origin.
3. Arcade replies with `HS_READY`.
4. Arcade can then send XP or topic-completion events.
5. LMS answers each valid message with `HS_ACK`.

## Message types

### LMS → Arcade

#### `HS_INIT`

```json
{
  "type": "HS_INIT",
  "sessionId": "arcade-1710670000000",
  "gameId": "fraction-splash",
  "gameTitle": "Fraction Splash",
  "child": {
    "id": "child-1",
    "name": "Joshua",
    "grade": 6
  },
  "xp": 120,
  "topicTags": [
    {
      "id": "m6-3",
      "subject": "Mathematics",
      "title": "Fractions: add & subtract (unlike denominators)"
    }
  ]
}
```

### Arcade → LMS

#### `HS_READY`

Sent when the game is loaded and ready to receive/confirm the session.

```json
{
  "type": "HS_READY",
  "sessionId": "arcade-1710670000000"
}
```

#### `HS_PING`

Health check message. LMS responds with `HS_ACK` and `pong: true`.

#### `HS_XP`

Awards XP to the active learner for the current Arcade session.

```json
{
  "type": "HS_XP",
  "sessionId": "arcade-1710670000000",
  "payload": {
    "amount": 15
  }
}
```

#### `HS_TOPIC_DONE`

Marks one or more tagged CAPS topics as done.

```json
{
  "type": "HS_TOPIC_DONE",
  "sessionId": "arcade-1710670000000",
  "payload": {
    "topicIds": ["m6-3"]
  }
}
```

## LMS acknowledgement

Every accepted, blocked, or ignored Arcade message receives an `HS_ACK`.

```json
{
  "type": "HS_ACK",
  "sessionId": "arcade-1710670000000",
  "status": "ok",
  "childId": "child-1",
  "xp": 135
}
```

Possible `status` values:

- `ok`
- `ignored`
- `blocked`

Common reasons:

- `origin_not_allowed`
- `session_not_active`
- `origin_session_mismatch`
- `invalid_xp`
- `unknown_type`
