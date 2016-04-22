function ChatController($scope) {
  //var socket = io.connect();
  socket = io.connect();

  $scope.messages = [];
  $scope.roster = [];
  $scope.name = '';
  $scope.text = '';

  socket.on('connect', function() {
    console.log('Connected');
    $scope.setName();
  });

  socket.on('message', function(msg) {
    console.log('Recived message:', msg);
    $scope.messages.push(msg);
    $scope.$apply();
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
    $scope.roster = names;
    $scope.$apply();
    checkPlacemarks(names);
  });

  $scope.send = function send() {
    console.log('Sending message:', $scope.text);
    socket.emit('message', $scope.text);
    $scope.text = '';
  };

  $scope.setName = function setName() {
    console.log('Sending name:', $scope.name);
    socket.emit('identify', $scope.name);
  };

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