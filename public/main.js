const socket = io('ws://localhost:8080');

socket.on('message', (bid) => {
  document.querySelector('.incoming').innerHTML = bid;
});

socket.on('update history', (bid) => {
  document.querySelector('.incoming').innerHTML = bid;
});

document.querySelector('button').onclick = () => {
  const value = document.querySelector('input').value;
  socket.emit('bid', value);
};
