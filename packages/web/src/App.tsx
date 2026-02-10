import { useState } from 'react';

export function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>🎵 AI Music Creator</h1>
      <p>React is working! Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
