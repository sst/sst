import React from 'react';
import ReactDOMServer from 'react-dom/server';

function User(props: Event) {
   return (
    <>
        name: {props.name}
    </>
  )
}
export async function handler(event: Event){
  const  { name } = event;
  const text = ReactDOMServer.renderToStaticMarkup(<User name={name} />);

  return {
    text
  }
}
