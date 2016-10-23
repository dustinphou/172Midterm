var csv = require('fast-csv')
var request = require('request')
var repl = require('repl')
var uu = require('underscore')
var path = require('path')
var fs = require('fs')
var orderBuffer = []	//array that stores transactions to be placed in orders.csv later, each order is a string that is later parsed
var filePath = path.join(__dirname, 'orders.csv')

var weekday = new Array(7); //two arrays used for timestamps
weekday[0] = "Sun";
weekday[1] = "Mon";
weekday[2] = "Tue";
weekday[3] = "Wed";
weekday[4] = "Thu";
weekday[5] = "Fri";
weekday[6] = "Sat";

var month = new Array(12);
month[0] = "Jan";
month[1] = "Feb";
month[2] = "Mar";
month[3] = "Apr";
month[4] = "May";
month[5] = "Jun";
month[6] = "Jul";
month[7] = "Aug";
month[8] = "Sep";
month[9] = "Oct";
month[10] = "Nov";
month[11] = "Dec";

//assumptions: all inputs will be given in ALL CAPS
function entry(cmd) //an entry point for the eval field to be used by REPL
{
	cmd = cmd.replace(/\n$/, '') 	//chops off /n added from REPL
	var args = cmd.split(' ') 		// [action, amount, symb]
	if(args[0] == 'ORDERS')
	{
		save_orders();
	}
	else if(args[0] == 'BUY' || args[0] == 'SELL')
	{
		validation(args[0], args[1], args[2], cmd)
	}
	else
	{
		console.log("Commands available:\nBUY <amount> [currency]\nSELL <amount> [currency]\nORDERS")
	}
}

function validation(action, amount, symb, order)	//first validates whether or not currency exists; if not, do nothing
{
	if(!isNaN(amount) && amount > 0) //checks if a valid amount was specified
	{
		if(symb !== undefined)
		{
			request('https://api.coinbase.com/v1/currencies', function (error, response, body){
				if (!error && response.statusCode == 200) {
					var currencies = JSON.parse(body)
					currencies = uu.flatten(currencies)		//combines all objects since only thing that needs to be checked is if a certain string exists
					if(uu.find(currencies, function (curr) {return curr == symb}))	//checks entire list sent back from coinbase for matching currency, takes a long time if value is low on list
					{
					 	console.log('Currency valid.')
					 	transaction(action, amount, symb, order)
					} 
					else
					{
						console.log('No known exchange rate for BTC/' + symb + '. Order failed.')				
					}
				}
				else
				{
					console.log('There was an error with the request.')
				}
			})
		}
		else	//in the case that a currency type was not provided, assume user wants to make BTC transactions
		{
			order = order + ' BTC'
			if(action == 'BUY') 
			{
				console.log('Order to BUY ' + amount + ' BTC queued.')
				orderBuffer.push(append_date_time(order) + ' : undefined')	//buy and sell values for this command were vague, just left as undefined
			}
			else if (action == 'SELL') 
			{
				console.log('Order to SELL ' + amount + ' BTC queued.')
				orderBuffer.push(append_date_time(order) + ' : undefined')
			}
		}
	}
	else
	{
		console.log('No amount specified.')
	}
}

function transaction(action, amount, symb, order)	//retrieves exchange rates for type of currency provided
{
	var low_symb = symb.toLowerCase()	//the object received from coinbase uses lower case
	var buy = 'btc_to_' + low_symb 		//create two strings, one to find buy rate and one for sell rate
	var sell = low_symb + '_to_btc'
	request('https://api.coinbase.com/v1/currencies/exchange_rates', function (error, response, body){
		if (!error && response.statusCode == 200) {
			var exchange_rates = JSON.parse(body)
			if(action == 'BUY')
			{
				console.log('order to BUY ' + amount + ' worth of BTC queued @ ' + exchange_rates[buy] + ' BTC/' + symb.toUpperCase() + ' (' + (exchange_rates[buy]*amount) + ' BTC)')
				orderBuffer.push(append_date_time(order) + ' : ' + exchange_rates[buy])
			}
			else if(action == 'SELL')
			{
				console.log('order to SELL ' + amount + ' worth of ' + symb + ' queued @ ' + exchange_rates[sell] + ' ' + symb.toUpperCase() + '/BTC' + ' (' + (exchange_rates[sell]*amount) + ' BTC)')
				orderBuffer.push(append_date_time(order) + ' : ' + exchange_rates[sell])
			}
		}
		else
		{
			console.log('There was an error with the request.')
		}
	})
}

function append_date_time(order)	//generates the date string that is appended to each order, couldn't find a module to make this not extremely long
{
	//Wed Oct 05 2016 22:09:40 GMT+0000 (UTC) : BUY 10 : UNFILLED
	//Weekday Month Day Year Time Timezone : order : UNFILLED
	var d = new Date();
	order = weekday[d.getUTCDay()] + ' ' + month[d.getUTCMonth()] + ' ' + d.getUTCDate() + ' ' + d.getUTCFullYear() + ' ' + d.getUTCHours() + ':' + d.getUTCMinutes() + ':' + d.getUTCSeconds() + ' : ' + order
	return order
}

function save_orders()	//parses order strings and pipes them to write stream via fast-csv to generate csv file
{
	var csvBuffer = uu.map(orderBuffer, function (order) {	//creates a new array of order objects with each part of the order string properly tied to an attribute	
		var splitorder = order.split(' : ')					//splits each order up int sub-arrays that can be easily addressed to provide values to the obj sent to csv
		var splitcmd = splitorder[1].split(' ')
		var csvorder = {
			"timestamp":splitorder[0],
			"command":splitcmd[0],
			"amount":splitcmd[1],
			"currency":splitcmd[2],
			"exchange rate to BTC": splitorder[2]
		}
		return csvorder
	})
console.log('	===	CURRENT ORDERS ===')
uu.each(orderBuffer, function(order) {
	console.log(order + ' : UNFILLED') //left exchange rate in the string printed to console since it wasn't used for anything else
})
var writableStream = fs.createWriteStream(filePath)
csv.write(csvBuffer, {headers:true}).pipe(writableStream)
}

repl.start({prompt: 'coinbase>', eval:entry})