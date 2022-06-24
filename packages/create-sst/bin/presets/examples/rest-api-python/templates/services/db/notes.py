import time
import numpy

def getNotes():
  return {
      "id1": {
          "noteId":    "id1",
          "userId":    "user1",
          "content":   str(numpy.array([1,2,3,4])),
          "createdAt": int(time.time()),
      },
      "id2": {
          "noteId":    "id2",
          "userId":    "user2",
          "content":   str(numpy.array([5,6,7,8])),
          "createdAt": int(time.time()-1000),
      },
  }
