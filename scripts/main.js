let handler = {
	"jsonData": {},
	"monthNames": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
	"attachEventListeners": function(){

		$('input[name="dtpOnward"]').on('change', function(){
			handler.setMinMaxDates($(this).val(), $('input[name="dtpReturn"]'));
		});

		// SHOW INDIVIDUAL PRICES
		$(document).on('click', '.showIndividualPrices', function(){
			$(this).siblings('.individualPrices').slideToggle();
		});

		// TAB CLICK
		$(document).on('click', '.tab', function(){
			if(!$(this).hasClass('active')){
				$(this).addClass('active').siblings().removeClass('active');
				if($(this).html().toLowerCase() === 'return') {
					$('.retDateGroup').slideDown();
					$('input[name="dtpReturn"]').prop('required', true);
				}
				else {
					$('.retDateGroup').slideUp();
					$('input[name="dtpReturn"]').prop('required', false);
					$('input[name="dtpReturn"]').val('');
				}
			}
		});

		// INPUT FOCUS
		$(document).on('focus', '.txtInput', function(e){
			e.stopPropagation();
			if($('ul.autocomplete').is(':visible')) $('ul.autocomplete').hide();
			$(this).siblings('ul.autocomplete').show();
		});
		$(document).on('click', function(){
			$('ul.autocomplete:visible').hide();
		});
		$(document).on('click', '.txtInput', function(e){
			e.stopPropagation();
		})

		// autocomplete click
		$(document).on('click', '.autolistli', function(e){
			e.stopPropagation();
			$(this).parents('ul').siblings('input[type="text"]').val($(this).text())
			$(this).parents('ul').siblings('input[type="text"]').attr("data-val", $(this).attr("data-val"));
			$(this).parents('ul').hide();
		});

		//FORM SUBMIT
		$('#searchForm').on('submit', function(e){
			e.preventDefault();
			if($('#txtSource').val().toLowerCase() === $('#txtDestination').val().toLowerCase()){
				alert('Source and Destination cannot be the same.');
				return false;
			}
			$('#priceFilterRange').val('1000'); // reset value on submit

			if($(window).width() <= 767){ //mobile view
				$('#searchFormContainer').slideUp();
			}

			var formData = handler.getFormData($(this));
			handler.showResults(formData);
		});

		// PRICE SLIDER
		$('#priceFilterRange').on('input', function(e){
			let price = this.value;
			$('.priceValue').html('Flights below &#x20b9;' + price);
			let results = $('li.flightCard');
			results.hide();
			if(!!results && results.length > 0){
				for(let res of results){
					if(parseInt($(res).find('.rightBox').attr('data-price')) <= price){
						$(res).show();
					}
				}
			}
		});

		$(document).on('click', '#hamburger', function(){
			$('#searchFormContainer').slideToggle();
		});

		$(document).on('click', '.showAll', function(){
			$('li.flightCard').show();
			$('#priceFilterRange').val('1000'); // reset filter
		});
	},
	"loadJSON" : function(url, callback) {   
		let xreq = new XMLHttpRequest();
		xreq.overrideMimeType("application/json");
		xreq.open('GET', url, true);

		xreq.onreadystatechange = function () {
			if (xreq.readyState == 4 && xreq.status == "200") {
				handler.jsonData = JSON.parse(xreq.responseText);
				if(!!callback && typeof callback === 'function') callback(handler.jsonData);
			}
		};

		xreq.send(null);  
	},
	"showResults" : function(formData){
		let flightArray = [];
		let flightArrayReturn = [];
		let flight_data = handler.jsonData['flight_master'];
		let seats_data = handler.jsonData['seat_master'];
		let is_return = (!!formData['return_date'] ? true : false);
		if(!!formData){
			//filter for flights between source and destination
			let flightsList = $.grep(flight_data, function(obj){
				return obj['depart_city'] === formData['depart_city'] && obj['arrive_city'] === formData['arrive_city'];
			});

			// onward flights seat check
			if(!!flightsList && flightsList.length > 0){
				for(let flight of flightsList){
					let flight_code = flight['code'];
					let temp = $.grep(seats_data, function(seatobj){
						return seatobj['code'] === flight_code && parseInt(seatobj['available_seats']) >= parseInt(formData['passengers'])
					});
					if(!!temp && temp.length > 0) flightArray.push(flight);
				}	
			}


			let flightsListReturn = false;
			if(is_return){
				flightsListReturn = $.grep(flight_data, function(obj){
					return obj['arrive_city'] === formData['depart_city'] && obj['depart_city'] === formData['arrive_city'];
				});

				// return flight seat check
				if(!!flightsListReturn && flightsListReturn.length > 0){
					for(let flight_ret of flightsListReturn){
						let flight_code_ret = flight_ret['code'];
						let temp = $.grep(seats_data, function(seatobj){
							return seatobj['code'] === flight_code_ret && parseInt(seatobj['available_seats']) >= parseInt(formData['passengers'])
						});
						if(!!temp && temp.length > 0) flightArrayReturn.push(flight_ret);
					}	
				}
			}

			if(is_return && flightArray.length > 0 && flightArrayReturn.length > 0){ // if return enabled and both arrays contain flights
				let onward_len = flightArray.length;
				let return_len = flightArrayReturn.length;
				if(onward_len > return_len) flightArray = flightArray.slice(0, return_len);
				else flightArrayReturn = flightArrayReturn.slice(0, onward_len);

				handler.printResults(formData, is_return, flightArray, flightArrayReturn);
			}
			else if(flightArray.length > 0) { // else if only onward
				handler.printResults(formData, is_return, flightArray);
			}
			else $('.resultContainer').html('<p class="message"><span class="centerimg"><img src="res/img/centericon.png" /></span><span>No Flight Records Found</span></p>');
			
		}
	},
	"printResults": function(formData, is_return, flightArray, flightArrayReturn){
		let htm = '';
		let route = (!!formData['return_date'] ? formData['depart_city_name'] + ' > ' + formData['arrive_city_name'] + ' > ' + formData['depart_city_name'] : formData['depart_city_name'] + ' > ' + formData['arrive_city_name']); 
		let onwardDate = new Date(formData['onward_date']);
		let onwardDateString = (!!onwardDate ? handler.monthNames[onwardDate.getMonth() + 1] + ' ' + onwardDate.getDate() + ', ' + onwardDate.getFullYear() : '');

		let returnDate, returnDateString, showIndividualPricesFlag, lhAdjust;
		returnDate = ''; returnDateString = ''; showIndividualPricesFlag = ''; lhAdjust = '';
		if(is_return){
			returnDate = new Date(formData['return_date']);
			returnDateString = '<p id="returnDate">Return: ' + handler.monthNames[returnDate.getMonth() + 1] + ' ' + returnDate.getDate() + ', ' +  returnDate.getFullYear() + '</p>';
			lhAdjust = ' lhAdjust';
		}
		else showIndividualPricesFlag = 'display: none;';

		htm += '<div id="displayRoute"><div class="routePath">'+route+'</div><div class="routeDates'+lhAdjust+'"><p id="onwardDate">Depart: '+onwardDateString+'</p>'+returnDateString+'</div></div>';

		if(!!flightArray && flightArray.length > 0){
			htm += '<div id="resultList"><ul>';
			for(let i=0;i < flightArray.length; i++){
				let res = flightArray[i];
				let total_price = parseInt(res['price']);
				let individualPricesHTML = '<p class="onwardPrice">onward: &#x20b9; '+res['price']+'</p>';

				htm += `<li class="flightCard">
							<div class="leftBox">
								<div class="onwardDetails">
									<div class="logoCont"><img class="logoImg" src="res/img/${res['logo']}" /></div>
									<div class="flightCont">
										<label>Onward Flight Details</label>
										<div class="departureDetails"><p class="time">${res['depart_time']}</p><p class="city">${res['depart_city']}</p></div>
										<div class="flightPath"><p class="routeImg"></p><p class="flightNo">${res['code']}</p></div>
										<div class="arrivalDetails"><p class="time">${res['arrive_time']}</p><p class="city">${res['arrive_city']}</p></div>
									</div>
								</div>`;

				if(is_return){ // add return flight html
					let res2 = flightArrayReturn[i];
					total_price += parseInt(res2['price']);
					individualPricesHTML += '<p class="returnPrice">return: &#x20b9; '+res2['price']+'</p>';
					
					htm += `<div class="returnDetails">
								<div class="logoCont"><img class="logoImg" src="res/img/${res2['logo']}" /></div>
								<div class="flightCont">
									<label>Return Flight Details</label>
									<div class="departureDetails"><p class="time">${res2['depart_time']}</p><p class="city">${res2['depart_city']}</p></div>
									<div class="flightPath"><p class="routeImg"></p><p class="flightNo">${res2['code']}</p></div>
									<div class="arrivalDetails"><p class="time">${res2['arrive_time']}</p><p class="city">${res2['arrive_city']}</p></div>
								</div>
							</div>`;
				}
				htm += '</div>';
				htm += '<div class="rightBox" data-price="'+total_price+'"><div class="priceCont"><div class="centerWrap"><p class="totalPrice">&#x20b9; '+total_price+'</p><p class="showIndividualPrices" style="'+showIndividualPricesFlag+'">Show Individual Prices</p><div class="individualPrices">'+individualPricesHTML+'</div><button id="bookFlight">Select Flight</button></div></div></div>';
				htm += '</li>';
			}
			htm += '</ul></div>';
		}

		$('.resultContainer').html(htm);
	},
	"loadAutoComplete": function(data){
		if(!!data){
			let citylist = data['city_master'];
			let autolisthtm = '';
			for(let city of citylist){
				autolisthtm += '<li class="autolistli" data-val="'+city.city_code+'">'+city.city_name  + ' - ' + city.city_code +'</li>';
			}
			$('ul.autocomplete').html(autolisthtm);
		}
	},
	"setMinMaxDates": function(dateobj, el){
		let dateinput = el;
		let dt = new Date(dateobj);
		let minDate = dt.getFullYear() + '-' + handler.paddDate((dt.getMonth() + 1)) + '-' + handler.paddDate(dt.getDate());
		let maxDate;
		if(dt.getMonth() < 6){
			maxDate = dt.getFullYear() + '-' + handler.paddDate(dt.getMonth() + 6 + 1) + '-' + handler.paddDate(dt.getDate());
		}
		else maxDate = (dt.getFullYear() + 1) + '-' + handler.paddDate(((dt.getMonth() + 6 + 1) - 12)) + '-' + handler.paddDate(dt.getDate());

		if(!! new Date(minDate)) dateinput.attr('min', minDate)
		if(!! new Date(maxDate)) dateinput.attr('max', maxDate);
	},
	"getFormData" : function(form){
		let formData = {};
		formData['depart_city_name'] = form.find('input[name="txtSource"]').val().split('-')[0].trim();
		formData['arrive_city_name'] = form.find('input[name="txtDestination"]').val().split('-')[0].trim();
		formData['onward_date'] = form.find('input[name="dtpOnward"]').val();
		formData['return_date'] = form.find('input[name="dtpReturn"]').val();
		formData['passengers'] = form.find('input[name="txtPassCount"]').val();
		formData['depart_city'] = form.find('#txtSource').attr('data-val');
		formData['arrive_city'] = form.find('#txtDestination').attr('data-val');

		return formData;
	},
	"paddDate": function(val){
		if(val.toString().length === 1) return '0' + val;
		else return val;
	}
}

window.onload = function(){

	handler.setMinMaxDates(new Date(), $('input[name="dtpOnward"]'));

	handler.loadJSON('data/data.json', function(data){
		handler.loadAutoComplete(data);
	});

	handler.attachEventListeners();
}