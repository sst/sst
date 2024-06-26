package bus

import (
	"context"
	"log/slog"
	"reflect"
	"sync"
)

type Event any

var mutex sync.RWMutex
var subscribers map[any][]any = map[any][]any{}

func Publish[T Event](event T) {
	mutex.RLock()
	defer mutex.RUnlock()
	t := reflect.TypeOf(event)
	slog.Info("publishing", "type", t)

	subscribers, ok := subscribers[t]
	if !ok {
		return
	}
	for _, subscriber := range subscribers {
		subscriber.(func(T))(event)
	}
}

func Subscribe[T Event](ctx context.Context, fn func(T)) {
	mutex.Lock()
	defer mutex.Unlock()
	t := reflect.TypeOf((*T)(nil)).Elem()

	s := subscribers[t]
	if s == nil {
		s = []interface{}{}
	}
	s = append(s, fn)
	index := len(s) - 1
	subscribers[t] = s
	slog.Info("subscribed", "type", t)
	go func() {
		<-ctx.Done()
		mutex.Lock()
		defer mutex.Unlock()
		slog.Info("unsubscribing", "type", t)
		subscribers[t] = append(s[:index], s[index+1:]...)
	}()
}

func Listen[T Event](ctx context.Context, example T) <-chan T {
	events := make(chan T, 100)
	mutex.Lock()
	defer mutex.Unlock()
	t := reflect.TypeOf((*T)(nil)).Elem()

	s := subscribers[t]
	if s == nil {
		s = []interface{}{}
	}
	s = append(s, func(event T) {
		events <- event
	})
	index := len(s) - 1
	subscribers[t] = s
	slog.Info("subscribed", "type", t)
	go func() {
		<-ctx.Done()
		mutex.Lock()
		defer mutex.Unlock()
		slog.Info("unsubscribing", "type", t)
		subscribers[t] = append(s[:index], s[index+1:]...)
		// close(events)
	}()

	return events
}
