import Note from "../../../services/Note";
import listNotes from "../../../services/listNotes";
import createNote from "../../../services/createNote";
import updateNote from "../../../services/updateNote";
import deleteNote from "../../../services/deleteNote";
import getNoteById from "../../../services/getNoteById";

type AppSyncEvent = {
  info: {
    fieldName: string;
  };
  arguments: {
    note: Note;
    noteId: string;
  };
};

export async function handler(
  event: AppSyncEvent
): Promise<Record<string, unknown>[] | Note | string | null | undefined> {
  switch (event.info.fieldName) {
    case "listNotes":
      return await listNotes();
    case "createNote":
      return await createNote(event.arguments.note);
    case "updateNote":
      return await updateNote(event.arguments.note);
    case "deleteNote":
      return await deleteNote(event.arguments.noteId);
    case "getNoteById":
      return await getNoteById(event.arguments.noteId);
    default:
      return null;
  }
}
