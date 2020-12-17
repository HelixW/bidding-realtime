const socket = io('ws://localhost:8080');

socket.on('message', (bid) => {
  document.querySelector('.incoming').innerHTML = bid;
});

socket.on('history', (res) => {
  // Bid placed below previous or minimum
  if (res.error) document.querySelector('.incoming').innerHTML = 'The bid you placed was too small';

  // Update history
  const listGroup = document.querySelector('.list-group');
  listGroup.innerHTML = '';
  res.history.reverse().forEach((item) => {
    const listItem = document.createElement('li');
    listItem.className = 'list-group-item';
    listItem.innerHTML = `User '${item.id.substr(1, 4)}' bid ${item.bid}`;
    listGroup.appendChild(listItem);
  });
});

socket.on('minimum', (val) => {
  document.querySelector('.min-bid').innerHTML = val;
});

document.querySelector('button').onclick = () => {
  const value = document.querySelector('input').value;
  socket.emit('bid', { questionID: 'something', bid: value });
};
