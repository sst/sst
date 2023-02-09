import json
from db.notes import getNotes

def main(event, context):
  notes = getNotes()
  noteId = event["pathParameters"]["id"]

  if noteId in notes:
    eventBody = json.loads(event["body"])
    note = notes[noteId]
    note["content"] = eventBody["content"]
    return {
      "statusCode": 200,
      "body": json.dumps(note, indent=2)
    }

  return {
    "statusCode": 404,
    "body": json.dumps({
      "error": True
    })
  }
