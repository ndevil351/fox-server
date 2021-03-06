//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');
var fs = require('fs');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));

var messages = [];
var sockets = [];
var foxTimers = [];
var routeReqTimer;

var foxWaypoints = [];
var foxWaypoints_next = [];

//speed - это скорость в "попугаях": 1/42 м/мс, т.е. 1 = 23.8м/с или 85.7км/ч поэтому пересчитаем это из нормальной скорости
//а чтобы не скучно было, то будем еще и менять ее с каждым отрезком маршрута случайно от 40 до 100 км/ч =)))
var speed1 = 40; //минимальная скорость км/ч
var speed2 = 20; //+дельта к скорости (мин + (от 0 до дельта)) км/ч

//радиус определения лисы (м)
var distance_treshold = 50;
//сколько тикает таймер лисы (мс)
var foxTimerLimit = 10000;
//собственно кодик лисы =))
var level_up_code = 'ДогналРыжую532';
var foxCatched_msg = 'молодец, поймал! =))\n\r\n\rCP:' + level_up_code;

//сколько следующих точек передавать вместе с координатами лисы
var nextPointsOnMove = 20;
//и какой длины путь
var nextPointsOnMove_length = 500;
//...и через сколько точек
//var nextPointsOnMove_interval = 60;
var nextPointsOnMove_interval = Math.round((3.6 * nextPointsOnMove_length) / (nextPointsOnMove * ((speed1 + speed2) / 2) * 0.042));

var refPoints = [
  [60.010490, 30.211254], //камышовая
  [60.006118, 30.216662], //богатырский
  [60.000937, 30.234605], //планерная
  [59.996899, 30.220310], //яхтенная
  [59.997978, 30.201435], //лыжный пер
  [60.0082548, 30.2299333], //камышовая2
  [60.0067612, 30.2413863], //камышовая3
  [60.0052219, 30.2533007], //камышовая4
  [60.0018721, 30.2507472], //богатырский2
  [59.9960945, 30.2493310], //оптиков
  [59.9989110, 30.2550173], //торфяная
  [59.9935031, 30.2533382], //гаккелевская
  [59.9907290, 30.2473730], //мебельная
  [59.9941490, 30.2439129], //стародеревенская
  [59.9929558, 30.2271652], //мебельная2
];

var routeStart = [
  [60.002438, 30.200919] //спар (начало)
];

function initDefaultWayPoints() {
  console.log("Reading default waypoints...");
  if (fs.existsSync(__dirname + '/client/car/def_wp.json')) {
    var file = fs.readFileSync(__dirname + '/client/car/def_wp.json', 'utf8');
    foxWaypoints = JSON.parse(file);
    foxWaypoints_next = [].concat(foxWaypoints);
    console.log("Read done. " + foxWaypoints.length + " points.");
  }
  else {
    console.log("Read failed. File: " + __dirname + '/client/car/def_wp.json' + "not found.");
  }
}

initDefaultWayPoints();

/* Array.shuffle( deep ) - перемешать элементы массива случайным образом
deep - необязательный аргумент логического типа, указывающий на то, 
       нужно ли рекурсивно обрабатывать вложенные массивы;
       по умолчанию false (не обрабатывать)
*/
Array.prototype.shuffle = function(b) {
  var i = this.length,
    j, t;
  while (i) {
    j = Math.floor((i--) * Math.random());
    t = b && typeof this[i].shuffle !== 'undefined' ? this[i].shuffle() : this[i];
    this[i] = this[j];
    this[j] = t;
  }

  return this;
};

/*Этот метод был добавлен в спецификации ECMAScript 6 и пока может быть недоступен во всех реализациях JavaScript. Однако, вы можете использовать следующий кусочек кода в качестве полифилла:*/
if (!Array.prototype.find) {
  Array.prototype.find = function(predicate) {
    if (this == null) {
      throw new TypeError('Array.prototype.find called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };
}

var Fox = (function() {
  "use strict";

  var Fox = function() {
    var result = {};

    result.stop = function() {
      // чистим старый маршрут
      this.waypoints.length = 0;
    };
    /**
     * Метод анимации движения машики по марщруту.
     * @function
     * @name Car.moveTo
     * @param {Array} segments Массив сегментов маршрута.
     * @param {Object} [options] Опции анимации.
     * @param {Function} movingCallback Функция обратного вызова по-сегментам маршрута.
     * @param {Function} completeCallback Функция обратного вызова завершения анимации.
     */
    result.moveTo = function(movePoints, movingCallback, completeCallback) {
      // Получаем точечки
      this.waypoints = movePoints;
      // Запуск анимации
      var that = this,
        timer = setInterval(function() {
          // если точек больше нет - значит приехали
          if (that.waypoints.length === 0) {
            completeCallback(that);
            return clearTimeout(timer);
          }
          // берем следующую точку
          var nextPoint = that.waypoints.shift();
          // и отправляем в пользовательский callback
          movingCallback(that, nextPoint.coords, nextPoint.direction, nextPoint.speed);
        }, 42);
    };

    return result;
  };

  return Fox;
}());

function geoDistance(point1, point2) {
  if (!point1 || !point2) {
    return Infinity;
  }

  lat1 = point1[0] * Math.PI / 180;
  lng1 = point1[1] * Math.PI / 180;
  lat2 = point2[0] * Math.PI / 180;
  lng2 = point2[1] * Math.PI / 180;

  return Math.round(6378137 * Math.acos(Math.cos(lat1) * Math.cos(lat2) * Math.cos(lng1 - lng2) + Math.sin(lat1) * Math.sin(lat2)));
}

io.on('connection', function(socket) {

  messages.forEach(function(data) {
    socket.emit('message', data);
  });
  socket.emit('distance_treshold', distance_treshold);

  sockets.push(socket);

  if (foxWaypoints_next.length == 0) {
    route_calc_request();
  }

  socket.on('disconnect', function() {
    name = socket.store.data.name;
    socketid = socket.id;

    el_timers = foxTimers.find(function(element, index, array) {
      return element[0] == socketid;
    });

    if (el_timers) {
      foxTimers.splice(foxTimers.indexOf(el_timers), 1);
    }

    sockets.splice(sockets.indexOf(socket), 1);

    broadcast('removed', name + '-' + socketid);

    thelastOne = true;
    sockets.forEach(function(a) {
      if (a.store.data.name == name) {
        thelastOne = false;
      }
    });
    updateRoster();
    if (thelastOne) {
      broadcast('removedLastOne', name)
    }
  });

  socket.on('message', function(msg) {
    var text = String(msg || '');

    if (!text)
      return;

    socket.get('name', function(err, name) {
      var data = {
        name: name,
        text: text
      };

      broadcast('message', data);
      messages.push(data);
    });
  });

  socket.on('coords', function(msg) {
    var text = String(msg || '');

    if (!text)
      return;

    socket.get('name', function(err, name) {
      var data = {
        name: name,
        text: text
      };

      if (JSON.parse(text)[2]) {
        data.name = 'Fox-' + data.name + '-' + socket.id;
      }

      socket.last_data = data;

      checkFoxTimeouts(socket);

      data = socket.last_data; //данные могли измениться после проверки на таймауты лисы

      broadcast('coords', data);
      //messages.push(data);
    });
  });

  socket.on('identify', function(name) {
    socket.set('name', String(name.name || 'Anonymous'), function(err) {
      socket.name = name.name;
      socket.name_id = name.name_id;
      socket.player_name = name.player_name;
      updateRoster();
    });
  });

  socket.on('route_points_response', function(msg) {
    broadcast('route_calc_request_done', true);

    if (foxWaypoints.length == 0) {
      foxWaypoints = [].concat(JSON.parse(msg));
      console.log('foxWaypoints.length = ' + foxWaypoints.length);
      foxWaypoints_next = [].concat(JSON.parse(msg));
      console.log('foxWaypoints_next.length = ' + foxWaypoints_next.length);

      route_calc_request();
    }
    else {
      foxWaypoints_next = [].concat(JSON.parse(msg));
      console.log('foxWaypoints_next.length = ' + foxWaypoints_next.length);
    }
  });

  socket.on('send_coords', function(state) {
    if (state) {
      sockets.forEach(function(socket_e) {
        if (socket.name == socket_e.name && socket.id !== socket_e.id) {
          socket_e.send_coords = false;
          socket_e.emit('set_send_coords', socket_e.send_coords);
          broadcast('removed', socket_e.name + '-' + socket_e.id);
        }
      })
    }
    else {
      broadcast('removed', socket.name + '-' + socket.id);
    }
    socket.send_coords = state;
  })
});

// function updateRoster() {
//   async.map(
//     sockets,
//     function(socket, callback) {
//       //socket.get('name', callback);
//       socket.get('name', function(err, name) {
//         result = {};
//         result.id = socket.id;
//         if (!err) {
//           result.name = name
//         };
//         callback(err, result);
//       });
//     },
//     function(err, names) {
//       broadcast('roster', names);
//     }
//   );
// }
function updateRoster() {
  async.map(
    sockets,
    function(socket, callback) {
      socket.get('name', function(err, name) {
        result = {};
        result.id = socket.id;
        if (socket.last_data) {
          result.last_data = socket.last_data.text;
        }
        if (!err) {
          result.name = name;
        }
        callback(err, result);
      });
    },
    function(err, names) {
      broadcast('roster', names);
      //broadcast_adm('adm_sockets', sock_to_txt(sockets));
    }
  );
}

function broadcast(event, data) {
  sockets.forEach(function(socket) {
    socket.emit(event, data);
  });
}

function route_calc_request() {

  if (!routeReqTimer || ((new Date()).getTime() - routeReqTimer) > foxTimerLimit) { //не чаще чем раз в 10 секунд, иначе клиенты помирают
    routeReqTimer = (new Date()).getTime();

    routePoints = [].concat(routeStart).concat(refPoints.shuffle()).concat(routeStart);

    data = JSON.stringify({
      points: routePoints,
      speed1: speed1,
      speed2: speed2
    });

    broadcast('route_calc_request', data);

  }
}

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function() {
  var addr = server.address();
  console.log("Fox server listening at", addr.address + ":" + addr.port);
});

var Fox = new Fox();

function moveFox() {
  Fox.moveTo(foxWaypoints, function(obj, coords, direction, speed) {
    nextCoords = [];
    for (i = 0; i < foxWaypoints.length + foxWaypoints_next.length &&
      i < (nextPointsOnMove * nextPointsOnMove_interval); i += nextPointsOnMove_interval) {
      if (i < foxWaypoints.length) {
        nextCoords.push(foxWaypoints[i].coords);
      }
      else {
        nextCoords.push(foxWaypoints_next[i - foxWaypoints.length].coords);
      }
    }

    var data = {
      name: 'Fox-server',
      text: JSON.stringify([coords, '', direction, nextCoords, '', speed]),
      isFox: true
    };

    console.log('foxWaypoints.length = ' + foxWaypoints.length);
    console.log('foxWaypoints_next.length = ' + foxWaypoints_next.length);
    console.log('foxTimers = ' + JSON.stringify(foxTimers));

    //текущее состояние сохраняем в объекте
    Fox.timestamp = (new Date()).getTime();
    Fox.coords = coords;
    Fox.direction = direction;
    Fox.nextCoords = nextCoords;
    Fox.speed = speed;

    broadcast('coords', data);
    //messages.push(data);

    sockets.forEach(function(socket_e) {
      checkFoxTimeouts(socket_e);
    });

  }, function() {
    if (foxWaypoints_next.length > 0) {
      foxWaypoints = [].concat(foxWaypoints_next);
    }

    route_calc_request();

    moveFox();
  });
}

function checkFoxTimeouts(socket_e) {
  data = socket_e.last_data;
  if (data) {
    name = data.name;
    text = data.text;

    if (name !== 'Anonymous') {
      if (geoDistance(Fox.coords, JSON.parse(text)[0]) <= distance_treshold) {
        el_timers = foxTimers.find(function(element, index, array) {
          return element[0] == socket_e.id;
        });

        if (el_timers) {
          curr_timestamp = (new Date()).getTime();
          el_timers[2] += curr_timestamp - el_timers[1];
          el_timers[1] = curr_timestamp;

          //превысили таймаут
          data.isOnFox = el_timers[2];
          if (data.isOnFox >= foxTimerLimit && !socket_e.isFoxCatched) {
            // socket_e.emit('fox_catched', foxCatched_msg);
            // socket_e.isFoxCatched = true;
            sockets.forEach(function(socket_c) {
              if (socket_e.name == socket_c.name) {
                socket_c.emit('fox_catched', foxCatched_msg);
                socket_c.emit('level_up', level_up_code);
                socket_c.isFoxCatched = true;
              }
            });
          }

          broadcast('coords', data);
        }
        else {
          foxTimers.push([socket_e.id, (new Date()).getTime(), 0]);
        }
      }
      else {
        el_timers = foxTimers.find(function(element, index, array) {
          return element[0] == socket_e.id;
        });

        if (el_timers) {
          foxTimers.splice(foxTimers.indexOf(el_timers), 1);
          data.isOnFox = 0;

          broadcast('coords', data);
        }
      }
    }

    //broadcast('coords', data);
  }
}

moveFox();

router.get('/vars', function(req, res) {
  function sock_to_txt(s___) {
    r__ = [];
    s___.forEach(function(d_) {
      var d_coords;
      if (d_.last_data) {
        d_coords = JSON.stringify(JSON.parse(d_.last_data.text)[0]);
      }
      r__.push([d_.store.data.name, d_.id, d_.isFoxCatched, d_coords, d_.player_name]);
    });
    return JSON.stringify(r__);
  }

  var body = 'Local vars:<br>\n' +
    'speed1                     : ' + speed1 + '<br>\n' +
    'speed2                     : ' + speed2 + '<br>\n' +
    'distance_treshold          : ' + distance_treshold + '<br>\n' +
    'nextPointsOnMove           : ' + nextPointsOnMove + '<br>\n' +
    'nextPointsOnMove_interval  : ' + nextPointsOnMove_interval + '<br>\n' +
    'foxWaypoints.length        : ' + foxWaypoints.length + '<br>\n' +
    'foxWaypoints_next.length   : ' + foxWaypoints_next.length + '<br>\n' +
    'routeReqTimer                  : ' + routeReqTimer + '<br>\n' +
    'routeReqTimer                  : ' + (new Date(routeReqTimer)) + '<br>\n' +
    'foxTimers                  : ' + JSON.stringify(foxTimers) + '<br>\n' +
    'foxTimerLimit              : ' + JSON.stringify(foxTimerLimit) + '<br>\n' +
    //'sockets                    : '+JSON.stringify(sockets)+'<br>\n'+
    'Fox.timestamp              : ' + JSON.stringify(Fox.timestamp) + '<br>\n' +
    'Fox.coords                 : ' + JSON.stringify(Fox.coords) + '<br>\n' +
    'sockets.length                 : ' + sockets.length + '<br>\n' +
    'sockets                 : ' + sock_to_txt(sockets) + '<br>\n';
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Length', body.length);
  res.end(body);
});