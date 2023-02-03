import json
from db.notes import getNotes

def main(event, context):
  notes = getNotes()
  noteId = event["pathParameters"]["id"]

  if noteId in notes:
    return {
      "statusCode": 200,
      "body": json.dumps(notes[noteId], indent=2)
    }

  return {
    "statusCode": 404,
    "body": json.dumps({
      "error": True
    })
  }
