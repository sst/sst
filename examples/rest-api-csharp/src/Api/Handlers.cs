using System;
using System.Collections.Generic;
using System.Net;
using System.Text.Json;

using Amazon.Lambda.Core;
using Amazon.Lambda.APIGatewayEvents;

// Assembly attribute to concert the Lambda function's JSON input to a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace Api
{
    public class Handlers
    {
      private static JsonSerializerOptions jsonSerializeOptions = new JsonSerializerOptions(){
        WriteIndented = true
      };

      public APIGatewayHttpApiV2ProxyResponse List(APIGatewayHttpApiV2ProxyRequest request)
      {
        return new APIGatewayHttpApiV2ProxyResponse
        {
          StatusCode = (int)HttpStatusCode.OK,
          Body = JsonSerializer.Serialize<Dictionary<string, Note>>(getNotes(), jsonSerializeOptions),
        };
      }

      public APIGatewayHttpApiV2ProxyResponse Get(APIGatewayHttpApiV2ProxyRequest request)
      {
        var notes = getNotes();
        var noteId = request.PathParameters["id"];

        if (notes.ContainsKey(noteId))
        {
          return new APIGatewayHttpApiV2ProxyResponse
          {
            StatusCode = (int)HttpStatusCode.OK,
            Body = JsonSerializer.Serialize<Note>(notes[noteId], jsonSerializeOptions),
          };
        }

        return new APIGatewayHttpApiV2ProxyResponse
        {
          StatusCode = (int)HttpStatusCode.NotFound,
          Body = JsonSerializer.Serialize<Dictionary<string, bool>>(new Dictionary<string, bool> { ["error"] = true }),
        };
      }

      public APIGatewayHttpApiV2ProxyResponse Update(APIGatewayHttpApiV2ProxyRequest request)
      {
        var notes = getNotes();
        var noteId = request.PathParameters["id"];

        if (notes.ContainsKey(noteId))
        {
          Console.WriteLine(request.Body);
          var body = JsonSerializer.Deserialize<Dictionary<string, string>>(request.Body);
          var note = notes[noteId];
          note.Content = body["content"];
          return new APIGatewayHttpApiV2ProxyResponse
          {
            StatusCode = (int)HttpStatusCode.OK,
            Body = JsonSerializer.Serialize<Note>(note, jsonSerializeOptions),
          };
        }

        return new APIGatewayHttpApiV2ProxyResponse
        {
          StatusCode = (int)HttpStatusCode.NotFound,
          Body = JsonSerializer.Serialize<Dictionary<string, bool>>(new Dictionary<string, bool> { ["error"] = true }),
        };
      }

      private Dictionary<string, Note> getNotes()
      {
        return new Dictionary<string, Note>
        {
          ["id1"] = new Note
          {
            NoteId = "id1",
            UserId = "user1",
            CreatedAt = DateTime.Now,
            Content = "Hello World!",
          },
          ["id2"] = new Note
          {
            NoteId = "id2",
            UserId = "user2",
            CreatedAt = DateTime.Now.AddSeconds(-1000),
            Content = "Hello Old World! Old note.",
          },
        };
      }
    }
}
