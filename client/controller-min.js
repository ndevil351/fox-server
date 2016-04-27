function ChatController(server_url) {
  //var socket = io.connect();
  socket = io.connect(server_url);

  name = String(name || '');
  code = '';

  socket.on('connect', function() {
    console.log('Connected');
    setName();
  });

  socket.on('coords', function(msg) {
    console.log('Recived coords:', msg);
    if (msg.name && msg.name !== 'Anonymous') {
      //alert(msg.name+'\r\n'+msg.text);
      updatePlacemark(msg.name, msg.text, Boolean(msg.isFox), msg.isOnFox)
    };
  });

  socket.on('removedLastOne', function(name) {
    console.log('Removed the last buddy:', name);
    removePlacemark(name);
  });

  socket.on('removed', function(playerID) {
    console.log('Removed:', playerID);
    removePlacemark_one(playerID);
  });

  socket.on('fox_catched', function(msg) {
    console.log('fox_catched:', msg);
    updateFox(msg);
  });

  socket.on('level_up', function(level_up_code) {
    console.log('Reacived level-up:', level_up_code);
    if (document.getElementsByName("LevelAction.Answer").length > 0) {
      document.getElementsByName("LevelAction.Answer")[0].value = level_up_code;
      document.getElementsByName("LevelAction.Answer")[0].parentElement.submit();
    }
  });

  socket.on('route_calc_request', function(msg) {
    console.log('Route calc request reacived:', msg);
    calcRoute(JSON.parse(msg));
  });

  socket.on('route_calc_request_done', function(msg) {
    console.log('Route calc request DONE reacived:', msg);
    cashedReqRoute = null;
  });

  socket.on('roster', function(names) {
    console.log('Reacived roster:', names);
    client_names = [].concat(names);

    client_names.forEach(function(e) {
      if (e.name && e.name !== 'Anonymous') {
        updatePlacemark(e.name, e.last_data);
      }
    });

    checkPlacemarks(names);
  });

  socket.on('set_send_coords', function(state) {
    set_send_coords(state);
  })

  if (navigator.geolocation) {
    var timeoutVal = 10 * 1000 * 1000;
    navigator.geolocation.watchPosition(
      displayPosition,
      displayError, {
        enableHighAccuracy: true,
        timeout: timeoutVal,
        maximumAge: 0
      });
  }
  else {
    alert("Geolocation не поддерживается данным браузером");
  };

  // function displayPosition(position) {
  //   coordsText = "Широта: " + position.coords.latitude + "<br> Долгота: " + position.coords.longitude + "<br> Точность: " + position.coords.accuracy + "м<br> Скорость: " + position.coords.speed * 3.6 + " км/ч" + "<br> Обновлено: " + (new Date(position.timestamp)).toLocaleString() + "." + (new Date(position.timestamp)).getMilliseconds();

  //   arr = [
  //     [position.coords.latitude, position.coords.longitude], coordsText
  //   ];
  //   socket.emit('coords', JSON.stringify(arr));
  //   console.log('Sent coords:', JSON.stringify(arr));
  // };

  function displayError(error) {
    var errors = {
      1: 'Нет прав доступа',
      2: 'Местоположение невозможно определить',
      3: 'Таймаут соединения'
    };
  };
};

function setName() {
  console.log('Sending name:', {
    name: name,
    name_id: name_id,
    player_name: player_name
  });
  socket.emit('identify', {
    name: name,
    name_id: name_id,
    player_name: player_name
  });
}

function sendCode() {
  console.log('Sending code:', code);
  socket.emit('code', code);
}

function getTeamName() {
  name = document.getElementById('teamInfoFrame').contentDocument.getElementById('lnkTeamName').innerHTML;
  name_id = document.getElementById('teamInfoFrame').contentDocument.getElementById('lnkTeamName').getAttribute('href').replace('/Teams/TeamDetails.aspx?tid=', '');
  player_name = document.getElementById('teamInfoFrame').contentDocument.getElementById('lnkUserName').parentElement.previousElementSibling.previousElementSibling.previousElementSibling.innerHTML;
  setName();
  document.getElementById('teamInfoFrame').parentNode.removeChild(document.getElementById('teamInfoFrame'));
}