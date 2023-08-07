package main

import (
	"encoding/json"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/sst/examples/rest-api-go/db"
)

func Handler(request events.APIGatewayV2HTTPRequest) (events.APIGatewayProxyResponse, error) {
	var notes = db.Notes()
	var note = notes[request.PathParameters["id"]]

	if note == nil {
		return events.APIGatewayProxyResponse{
			Body:       `{"error":true}`,
			StatusCode: 404,
		}, nil
	}

	var body map[string]string
	_ = json.Unmarshal([]byte(request.Body), &body)

	note["content"] = body["content"]

	response, _ := json.Marshal(note)

	return events.APIGatewayProxyResponse{
		Body:       string(response),
		StatusCode: 200,
	}, nil
}

func main() {
	lambda.Start(Handler)
}
