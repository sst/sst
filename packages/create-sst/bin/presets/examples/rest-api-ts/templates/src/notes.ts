interface Note {
  noteId: string;
  userId: string;
  createdAt: number;
  content: string;
}

const notes: { [key: string]: Note } = {
  id1: {
    noteId: "id1",
    userId: "user1",
    createdAt: Date.now(),
    content: "Hello World!",
  },
  id2: {
    noteId: "id2",
    userId: "user2",
    createdAt: Date.now() - 10000,
    content: "Hello Old World! Old note.",
  },
};

export default notes;
