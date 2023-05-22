const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');

const messagesFile = 'messages.json';

// Check if the messages file exists, create it if it doesn't
if (!fs.existsSync(messagesFile)) {
    const initialMessages = [];
    fs.writeFileSync(messagesFile, JSON.stringify(initialMessages), 'utf8', (err) => {
      if (err) {
        console.log('Error creating messages file:', err);
      }
    });
  }
  
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/login.html');
});

app.post('/login', (req, res) => {
  const { username } = req.body;
  if (username) {
    res.cookie('username', username);
    res.redirect('/');
  } else {
    res.redirect('/login');
  }
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
  console.log('A user connected');

  // Read existing messages from the file
  fs.readFile(messagesFile, 'utf8', (err, data) => {
    if (err) {
      console.log('Error reading file:', err);
      return;
    }

    let messages = [];
    if (data) {
      messages = JSON.parse(data);
    }

    socket.emit('chat history', messages);
  });

  socket.on('chat message', function (message) {
    const cookies = socket.handshake.headers.cookie;
    const username = getCookieValue(cookies, 'username') || 'Anonymous';
    const messageData = {
      username: username,
      message: message,
    };

    // Append the message data to the file
    fs.readFile(messagesFile, 'utf8', (err, data) => {
      if (err) {
        console.log('Error reading file:', err);
        return;
      }

      let messages = [];
      if (data) {
        messages = JSON.parse(data);
      }

      messages.push(messageData);

      fs.writeFile(messagesFile, JSON.stringify(messages), (err) => {
        if (err) {
          console.log('Error writing to file:', err);
        }
      });
    });

    io.emit('chat message', messageData);
  });

  socket.on('disconnect', function () {
    console.log('A user disconnected');
  });
});

http.listen(3000, function () {
  console.log('Server is listening on port 3000');
});

function getCookieValue(cookieString, cookieName) {
  const cookies = cookieString.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const [name, value] = cookies[i].trim().split('=');
    if (name === cookieName) {
      return value;
    }
  }
  return undefined;
}
