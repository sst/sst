package main

import (
  "errors"
  "github.com/aws/aws-lambda-go/lambda"
)

func OnlyErrors() error {
  return errors.New("something went wrong!")
}

func main() {
  lambda.Start(OnlyErrors)
}
