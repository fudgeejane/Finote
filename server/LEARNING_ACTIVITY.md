# Learning activity and progress

`GET /api/learning-activity?timezone=<IANA zone>` returns the shared account-scoped summary used by Home and Progress. The activity display is the Monday-through-Sunday calendar week containing today in the requested timezone (UTC when missing or invalid). The current streak is the run ending today, or yesterday if today has no qualifying event. Historical event dates are grouped in the timezone stored on each event, so changing the requested timezone changes the current week boundary but does not rewrite historical event dates. One or more qualifying events on a date count as one streak day.

Qualifying records are written only by authenticated server workflows: new note creation, persisted exam submission, and a fully rated completed flashcard round. Client `POST /api/learning-activity` writes are retired with HTTP 410; opened tools, answer autosaves, mutable deck state, note edits, and imports do not count.

Exam scores are calculated from the owned saved exam questions when the attempt is persisted. Objective questions use normalized exact answer matching; essays and other unsupported question types are excluded. Attempts with no gradable questions have a null score and still count toward the total. Activity records keep safe score and display metadata, never answers.

Flashcard completion is posted to `POST /api/study-materials/:materialId/sessions` with a stable session ID, selected valid card indices, and a rating for each selected card. The server persists an immutable completion timestamp and counts; ratings are self-reports. Each session ID is unique for the user and material event stream. Existing in-progress deck state and prior exam review records remain available.
