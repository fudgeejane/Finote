# Learning activity dates

Learning activity is stored per authenticated user and deduplicated by `(user, eventId)`. The supported events are a successfully created note, use or completion of a flashcard deck, and use or submission of a mock exam. Activity is grouped into calendar days for the IANA timezone sent by the client. The summary endpoint returns the current consecutive streak and a rolling seven day window ending today in that timezone.

The server validates IANA timezone names on writes. An omitted timezone uses UTC; an invalid timezone on a write is rejected with HTTP 400. An omitted or invalid timezone on a summary read uses UTC. Clients should send the browser's resolved timezone unless a future account preference provides a configured timezone.
