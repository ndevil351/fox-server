var myMap, car, car_nextMove, myGeoObjects, update_time, update_time_display, socket, cashedReqRoute, name, name_id, player_name, client_names;

var distance_treshold = 20;

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

function displayPosition(position) {
	coordsText = "Широта: " + position.coords.latitude +
		"<br> Долгота: " + position.coords.longitude +
		"<br> Точность: " + position.coords.accuracy +
		"м<br> Скорость: " + position.coords.speed * 3.6 + " км/ч" +
		"<br> Обновлено: " + (new Date(position.timestamp)).toLocaleString() + "." + (new Date(position.timestamp)).getMilliseconds() +
		"<br> Session: " + socket.socket.sessionid;

	if (!position.isFox) {
		position.isFox = false
	};

	arr = [
		[position.coords.latitude, position.coords.longitude], coordsText, position.isFox, [], socket.socket.sessionid, position.coords.speed * 3.6, player_name
	];
	socket.emit('coords', JSON.stringify(arr));
	console.log('Sent coords:', JSON.stringify(arr));

	myMap.setBounds(
		myGeoObjects.getBounds(), {
			checkZoomRange: true,
			duration: 1500,
			preciseZoom: true,
			zoomMargin: 100
		});
};

// Дождёмся загрузки API и готовности DOM.
ymaps.ready(init);
// Пример использования расширенного синтаксиса.
// ymaps.ready({
//     // successCallback будет вызван, когда произойдет загрузка API и модуля "myModule1".
//     require: ['router'],
//     successCallback: function (ym) {
//         init();
//     },
//     errorCallback: function(ym) {
//     	alert('error create map');
//     }
// });

function init() {
	// Создание экземпляра карты и его привязка к контейнеру с
	// заданным id ("map").
	myMap = new ymaps.Map('map', {
		// При инициализации карты обязательно нужно указать
		// её центр и коэффициент масштабирования.
		center: [59.997954, 30.233932], // Спб
		zoom: 15
	}, {
		autoFitToViewport: 'always'
			//searchControlProvider: 'yandex#search'
	});

	if (cashedReqRoute) { //выполним запрос на маршрут, если он все еще висит в кэше
		calcRoute(cashedReqRoute);
	};
	addFoxRoute();
}

function updatePlacemark(a, b, c, d) {
	if (c) {
		// new_time = (new Date()).getTime();
		// if (update_time) {
		// 	new_time = (new Date()).getTime();
		// 	car.properties.set('speed_now', Math.round(3600*myMap.options.get('projection').getCoordSystem().distance(car.geometry.getCoordinates(),JSON.parse(b)[0])/(new_time-update_time)));
		// 	update_time = new_time;

		// 	if ((new_time-update_time_display)>500) {
		// 		car.properties.set('speed', Math.round(JSON.parse(b)[5]) + ' ' + car.properties.get('speed_now'));
		// 		update_time_display = new_time;
		// 	};
		// } else {
		// 	update_time = new_time;
		// 	update_time_display = new_time;
		// };
		car.properties.set('speed', Math.round(JSON.parse(b)[5]));

		car.geometry.setCoordinates(JSON.parse(b)[0]);
		car.properties.set('direction', JSON.parse(b)[2].t);
		car.events.add('change', lookAtPlayers(car), this);

		car_nextMove.geometry.setCoordinates(JSON.parse(b)[3]);

		// myMap.setBounds(
		// 	myGeoObjects.getBounds(), {
		// 		checkZoomRange: true,
		// 		duration: 1500,
		// 		preciseZoom: true,
		// 		zoomMargin: 100
		// 	});

	}
	else {
		updated = false;
		for (i = 0; i < myMap.geoObjects.getLength(); i++) {
			m = myMap.geoObjects.get(i);
			if (b &&
				m.properties.get('playerID') == a + '-' + JSON.parse(b)[4]) {
				m.geometry.setCoordinates(JSON.parse(b)[0]);
				m.properties.set('iconContent', a + ((JSON.parse(b)[6]) ? ' (' + JSON.parse(b)[6] + ') ' : ' ') + ': ' + Math.round(JSON.parse(b)[5]) + 'км/ч');
				m.properties.set('balloonContentHeader', a);
				m.properties.set('balloonContent', JSON.parse(b)[1] + '<br>Is on fox tail: ' + d + 'ms');
				if (m.geometry.getType() == 'Circle') {
					img_index = (10 - Math.round(d / 1000));
					if (img_index >= 10) {
						img_index = 10;
					}
					else if (img_index <= 0) {
						img_index = -10 * (img_index % 2);
					};
					m.options.set('fillImageHref', 'car/' + img_index + '.png');
				};
				m.events.add('change', lookAtFox(m), this);
				updated = true;
			};
		};
		if (!updated) {
			for (i = 0; i < myGeoObjects.getLength(); i++) {
				m = myGeoObjects.get(i);
				if (b &&
					m.properties.get('playerID') == a + '-' + JSON.parse(b)[4]) {
					m.geometry.setCoordinates(JSON.parse(b)[0]);
					m.properties.set('iconContent', a + ((JSON.parse(b)[6]) ? ' (' + JSON.parse(b)[6] + ') ' : ' ') + ': ' + Math.round(JSON.parse(b)[5]) + 'км/ч');
					m.properties.set('balloonContentHeader', a);
					m.properties.set('balloonContent', JSON.parse(b)[1] + '<br>Is on fox tail: ' + d + 'ms');
					if (m.geometry.getType() == 'Circle') {
						img_index = (10 - Math.round(d / 1000));
						if (img_index >= 10) {
							img_index = 10;
						}
						else if (img_index <= 0) {
							img_index = -10 * (img_index % 2);
						};
						m.options.set('fillImageHref', 'car/' + img_index + '.png');
					};
					m.events.add('change', lookAtFox(m), this);
					updated = true;
				};

			};
		};

		if (!updated && b) {
			player = new ymaps.Placemark(JSON.parse(b)[0], {
				iconContent: a + ((JSON.parse(b)[6]) ? ' (' + JSON.parse(b)[6] + ') ' : ' ') + ': ' + Math.round(JSON.parse(b)[5]) + 'км/ч',
				balloonContentHeader: a,
				balloonContent: JSON.parse(b)[1] + '<br>Is on fox tail: ' + d + 'ms',
				isPlayer: true,
				isFox: false,
				playerID: a + '-' + JSON.parse(b)[4]
			}, {
				balloonPanelMaxMapArea: 0,
				draggable: false,
				preset: "islands#blueStretchyIcon",
				openEmptyBalloon: true
			});
			player.events.add('change', lookAtFox(player), this);

			if (JSON.parse(b)[4] == socket.socket.sessionid) {
				myGeoObjects.add(player);
			}
			else {
				myMap.geoObjects.add(player);

			};
		}
	}

	if (document.getElementById('debug-text')) {
		document.getElementById('debug-text').innerHTML = 'GeoObj: ' + myMap.geoObjects.getLength() + ' MyObj: ' + myGeoObjects.getLength();
	}
}

function lookAtFox(playerMark) {

	distance = car.getMap().options.get('projection').getCoordSystem().getDistance(playerMark.geometry.getCoordinates(), car.geometry.getCoordinates());

	if (distance < distance_treshold) {
		playerMark.options.set('preset', "islands#redStretchyIcon");

		updated = false;
		myMap.geoObjects.each(function(m) {
			if (m.geometry &&
				m.geometry.getType() == 'Circle' &&
				m.properties.get('playerID') == playerMark.properties.get('playerID')) {
				m.geometry.setCoordinates(playerMark.geometry.getCoordinates());
				updated = true;
			};
		}, this);
		myGeoObjects.each(function(m) {
			if (m.geometry &&
				m.geometry.getType() == 'Circle' &&
				m.properties.get('playerID') == playerMark.properties.get('playerID')) {
				m.geometry.setCoordinates(playerMark.geometry.getCoordinates());
				updated = true;
			};
		}, this);

		if (!updated) {
			circleMark = new ymaps.Circle(
				[playerMark.geometry.getCoordinates(),
					distance_treshold
				], {
					isPlayer: true,
					isFox: false,
					playerID: playerMark.properties.get('playerID')
				}, {
					//balloonPanelMaxMapArea: 0,
					draggable: false,
					zIndex: 10,
					zIndexHover: 10,
					// Цвет заливки.
					// Последний байт (77) определяет прозрачность.
					// Прозрачность заливки также можно задать используя опцию "fillOpacity".
					//fillColor: "#DB709377",//красный
					//strokeColor: "#990066",
					//
					//fillColor: '#ff663377', //рыжий
					//strokeColor: "#cc3300",
					//
					//fill: true,
					//fillMethod: stretch,
					fillImageHref: 'car/10.png',
					fillOpacity: 0.3,
					strokeColor: "#cc3300", //цвет обводки (рыжий)
					strokeOpacity: 0.5, // Прозрачность обводки.
					strokeWidth: 5 // Ширина обводки в пикселях.
				});

			if (circleMark.properties.get('playerID').search(socket.socket.sessionid) >= 0) {
				myGeoObjects.add(circleMark);
			}
			else {
				//рисовать или нет не свои отметки о поимке лисы
				//car.getMap().geoObjects.add(circleMark);
			};
		};
	}
	else {
		playerMark.options.set('preset', "islands#blueStretchyIcon");
		car.getMap().geoObjects.each(function(m) {
			if (m.geometry &&
				m.geometry.getType() == 'Circle' &&
				m.properties.get('playerID') == playerMark.properties.get('playerID')) {
				car.getMap().geoObjects.remove(m);
			};
		}, this);
		myGeoObjects.each(function(m) {
			if (m.geometry &&
				m.geometry.getType() == 'Circle' &&
				m.properties.get('playerID') == playerMark.properties.get('playerID')) {
				myGeoObjects.remove(m);
			};
		}, this);
	};
}

function lookAtPlayers(foxMark) {
	myMap.geoObjects.each(function(player) {
		if (player.properties.get('isPlayer')) {
			lookAtFox(player);
		};
	});
	myGeoObjects.each(function(player) {
		if (player.properties.get('isPlayer')) {
			lookAtFox(player);
		};
	});
}

function removePlacemark(a) {
	for (i = 0; i < myMap.geoObjects.getLength(); i++) {
		m = myMap.geoObjects.get(i);
		if (m.properties.get('playerID').search(a) >= 0 &&
			m.properties.get('isPlayer')) {
			myMap.geoObjects.remove(m);
		}
	};
	for (i = 0; i < myGeoObjects.getLength(); i++) {
		m = myGeoObjects.get(i);
		if (m.properties.get('playerID').search(a) >= 0 &&
			m.properties.get('isPlayer')) {
			myGeoObjects.remove(m);
		}
	};
}

function removePlacemark_one(a) {
	for (i = 0; i < myMap.geoObjects.getLength(); i++) {
		m = myMap.geoObjects.get(i);
		if (m.properties.get('playerID') == a &&
			m.properties.get('isPlayer')) {
			myMap.geoObjects.remove(m);
		}
	};
	for (i = 0; i < myGeoObjects.getLength(); i++) {
		m = myGeoObjects.get(i);
		if (m.properties.get('playerID') == a &&
			m.properties.get('isPlayer')) {
			myGeoObjects.remove(m);
		}
	};
}

function checkPlacemarks(placemark_names) {
	for (i = 0; i < myMap.geoObjects.getLength(); i++) {
		m = myMap.geoObjects.get(i);
		if (m.geometry &&
			m.geometry.getType() == "Point" &&
			m.properties.get('isPlayer') &&
			//			placemark_names.indexOf(m.properties.get('iconContent')) < 0) {
			!placemark_names.find(function(element, index, array) {
				return element.name + '-' + element.id == m.properties.get('playerID');
			})) {
			myMap.geoObjects.remove(m);
		}
	};
	for (i = 0; i < myGeoObjects.getLength(); i++) {
		m = myGeoObjects.get(i);
		if (m.geometry &&
			m.geometry.getType() == "Point" &&
			m.properties.get('isPlayer') &&
			//			placemark_names.indexOf(m.properties.get('iconContent')) < 0) {
			!placemark_names.find(function(element, index, array) {
				return element.name + '-' + element.id == m.properties.get('playerID');
			})) {
			myGeoObjects.remove(m);
		}
	};
}

function addFoxRoute() {
	n = 0;

	//++ машинка: https://github.com/zxqfox/ymaps
	$.getScript('https://fox-server.azurewebsites.net/car/car.js', function() {
		car = new Car({
			// iconLayout: ymaps.templateLayoutFactory.createClass(
			// 	'<div id="fox-icon" class="b-car b-car_blue b-car-direction-$[properties.direction]">$[properties.textFoxIcon]</div>'
			// )
			// iconLayout: ymaps.templateLayoutFactory.createClass(
			// 	'<div id="fox-icon" class="b-car b-car_blue b-car-direction-$[properties.direction]"></div>'
			// ),
			iconLayout: ymaps.templateLayoutFactory.createClass(
				'<div id="fox-icon" class="b-car b-car_blue b-car-direction-$[properties.direction]"></div><div class="b-info">{{ properties.speed }}км/ч</div>'
			),
			hideIconOnBalloonOpen: false,
			openEmptyBalloon: true,
			openBalloonOnClick: true
		});
		car.properties.set('isPlayer', false);
		car.properties.set('isFox', true);

		car.geometry.setCoordinates([59.997954, 30.233932]);

		// И "машинку" туда же

		car_nextMove = new ymaps.Polyline([
			car.geometry.getCoordinates()
		], {
			//hintContent: "Ломаная линия"
		}, {
			draggable: false,
			//strokeColor: '#0000FF77', //голубой
			strokeColor: '#ff400077', //рыжий
			strokeWidth: 10
		});

		myGeoObjects = new ymaps.GeoObjectCollection();
		myGeoObjects.add(car);
		myGeoObjects.add(car_nextMove);

		myMap.geoObjects.add(myGeoObjects);
	});
}

// нормализуем в один массив точек сегметны из ymaps
function makeWayPointsFromSegments_local(segments, options) {
	// делаем заготовку для кол-ва направлений. 4, 8 или 16 (+, x, *)
	var directionsVariants_local = {
		// стрелочки для разных направлений (нет стрелочек для 16)
		arrows: {
			w: '←',
			sw: '↙',
			s: '↓',
			se: '↘',
			e: '→',
			ne: '↗',
			n: '↑',
			nw: '↖',
		},
		// возможные направления для разной степени точности
		classes: {
			16: ['w', 'sww', 'sw', 'ssw', 's', 'sse', 'se', 'see', 'e', 'nee', 'ne', 'nne', 'n', 'nnw', 'nw', 'nww'],
			8: ['w', 'sw', 's', 'se', 'e', 'ne', 'n', 'nw'],
			4: ['w', 's', 'e', 'n']
		},
		n: function(x, y, n) {
			n = n || 8;
			var n2 = n >> 1; // half of n
			var number = (Math.floor(Math.atan2(x, y) / Math.PI * n2 + 1 / n) + n2) % n; // seems like there is a little bug here
			return {
				n: number,
				t: directionsVariants_local.classes[n][number]
			};
		},
		16: function(x, y) { // -> values in range [0, 16]
			return directionsVariants_local.n(x, y, 16);
		},
		8: function(x, y) { // -> values in range [0, 8]
			return directionsVariants_local.n(x, y, 8);
		},
		4: function(x, y) { // -> values in range [0, 4]
			return directionsVariants_local.n(x, y, 4);
		}
	};

	options = options || {};
	options.directions = [4, 8, 16].indexOf(options.directions) >= 0 ? options.directions : 8; // must be 4, 8, or 16
	options.speed = options.speed || 6;

	var points, street,
		wayList = [],
		// вспомогательные
		i, j, k, l, prev, cur, direction,
		getDirection = directionsVariants_local[options.directions],
		coordSystem = options.coordSystem;

	// открываю массив с точками
	points = [];
	// выполняю операцию для всех сегментов
	for (i = 0, l = segments.getLength(); i < l; i++) {
		// беру координаты начала и конца сегмента
		street = segments.get(i).geometry.getCoordinates();
		// и добавляю КАЖДУЮ ИЗ НИХ в массив, чтобы получить полный список точек
		for (j = 0, k = street.length; j < k; j++) {
			cur = street[j];
			// пропускаем дубли
			if (prev && prev[0].toPrecision(10) === cur[0].toPrecision(10) && prev[1].toPrecision(10) === cur[1].toPrecision(10)) {
				continue;
			}
			points.push(cur);
			prev = cur;
		}
	}

	// строим путь. берем 1 единицу расстояния, возвращаемого distance, за пройденный путь в единицу времени. в 1 единица времени - будет 1 смещение геоточки. ни разу не оптимальный, но наглядный алгоритм
	for (i = 0, l = points.length - 1; l; --l, ++i) {
		var from = points[i],
			to = points[i + 1],
			diff = [to[0] - from[0], to[1] - from[1]];
		direction = getDirection(diff[0], diff[1]);
		// каждую шестую, а то слишком медленно двигается. чрезмерно большая точность
		for (j = 0, k = Math.round(coordSystem.distance(from, to)); j < k; j += options.speed) {
			wayList.push({
				coords: [from[0] + (diff[0] * j / k), from[1] + (diff[1] * j / k)],
				direction: direction,
				vector: diff,
				speed: (3600 * options.speed / 42)
			});
		}
	}

	return wayList;
};

function calcRoute(requestedRoute) {
	if (ymaps.multiRouter) {
		multiRouteReq = new ymaps.multiRouter.MultiRoute({
			referencePoints: requestedRoute.points
		});

		cashedReqRoute = requestedRoute;

		multiRouteReq.events.add("update", function(newRoute) {

			routeReq = multiRouteReq.getActiveRoute();

			if (cashedReqRoute && routeReq) {
				wpTemp = [];
				routeReq.getPaths().each(function(pathCur) {

					wpTemp = wpTemp.concat(makeWayPointsFromSegments_local(pathCur.getSegments(), {
						speed: ((cashedReqRoute.speed1 + (Math.random() * cashedReqRoute.speed2)) * 42 / 3600),
						directions: 8,
						// ищем систему координат
						coordSystem: myMap.options.get('projection').getCoordSystem()
					}));
				}, this);

				socket.emit('route_points_response', JSON.stringify(wpTemp));

				cashedReqRoute = null;
			}
		}, this);
	}
	else {
		cashedReqRoute = requestedRoute;
	};
};

function updateFox(msg) {
	car.properties.set('balloonContent', msg.replace('\n\r', '<br>'));
	car.balloon.open();
	car.properties.set('isCatched', true);

	car.events.add('balloonclose', foxIsCatched(), this);
}

function foxIsCatched() {
	openTimer = setTimeout(function() {
		car.balloon.open();
		car.events.add('balloonclose', foxIsCatched(), this);
	}, 10000);
};