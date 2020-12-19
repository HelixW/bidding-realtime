const socket = io('ws://localhost:8080');

socket.on('message', (bid) => {
  document.querySelector('.incoming').innerHTML = bid;
});

socket.on('minimum', (value) => {
  document.querySelector('.min-bid').innerHTML = value;
});

socket.on('history', (history) => {
  const listGroup = document.querySelector('.list-group');
  listGroup.innerHTML = '';
  history.reverse().forEach((item) => {
    const listItem = document.createElement('li');
    listItem.className = 'list-group-item';
    listItem.innerHTML = `User '${item.id.substr(0, 4)}' bid ${item.bid}`;
    listGroup.appendChild(listItem);
  });
});

socket.on('invalid', (err) => {
  const element = document.querySelector('.alerts');
  element.innerHTML = err.message;

  const container = document.querySelector('#alert-container');
  container.classList = 'card-body bg-danger text-white';
});

socket.on('alert', (message) => {
  const element = document.querySelector('.alerts');
  element.innerHTML = message;

  const container = document.querySelector('#alert-container');
  container.classList = 'card-body bg-success text-white';
});

document.querySelector('button').onclick = () => {
  const qID = document.querySelector('.bid-questionID').value;
  const value = document.querySelector('.bid-input').value;
  socket.emit('bid', { questionID: qID.toString(), bid: value });
};
