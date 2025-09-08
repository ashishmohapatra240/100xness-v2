"use client";

import { useWs } from "../hooks/useWs";

const Trade = () => {

  const { messages } = useWs();


  return (

    <div>
      <ul>{messages.map((msg, id) => (
        <li key={id}>{msg}</li>
      ))}</ul>
    </div>
  )
}

export default Trade