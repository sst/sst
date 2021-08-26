using System;

namespace Api
{
    public class Note
    {
      public string NoteId { get; set; }
      public string UserId { get; set; }
      public DateTime CreatedAt { get; set; }
      public string Content { get; set; }
    }
}

