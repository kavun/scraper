var $ = require('jquery');
var remote = require('remote');
var fs = require('fs');
var dialog = remote.require('dialog');
var transform = require('stream-transform');
var parse = require('csv-parse');
var stringify = require('csv-stringify');
var ladda = require('ladda');

$('#downloadTemplate').on('click', function (e) {

	dialog.showSaveDialog({
		title: 'Save template.csv'
	}, function (path) {

		if (path == null) {
			return log('No path');
		}

		fs.writeFile(path,
			"URL, Elements\n" +
			"https://www.google.com, h1|.content\n" +
			"http://www.bing.com, sw_sform|#hp_bottomCell",
		function (err) {
			if (err) {
				return log(err);
			}

			gotTemplate();
		});

	});

	e.preventDefault();
	return false;
});


$('#uploadTemplate').on('click', function (e) {


	dialog.showOpenDialog({
		title : 'Choose .csv to scrape',
		properties: ['openFile'],
		filters: [
			{ name: '.csv', extensions: ['csv'] }
		]
	}, function (filenames) {
		if (filenames == null) {
			return log('Please select a file');
		}


		fs.readFile(filenames[0], function (err, data) {
			if (err) {
				return log(err);
			}

			scrape(filenames[0], function (err, data) {

				if (err) {
					return log(err);
				}

				dialog.showSaveDialog({
					title: 'Save scraped pages as .csv',
					filters: [
						{ name: '.csv', extensions: ['csv'] }
					]
				}, function (path) {

					if (path == null) {
						return log('No path');
					}

					fs.writeFile(path, data, function (err) {
						if (err) {
							return log(err);
						}

						saveFinished();
					});

				});

			});

		});

	});


	e.preventDefault();
	return false;
});

function saveFinished() {
	$('.container').hide();
	$('.done').show();
}


function gotTemplate() {
	$('#downloadTemplate').addClass('button-success');
}

function scrape(path, fn) {
	var l = ladda.create( document.querySelector( '#uploadTemplate' ) );
	l.start();
	l.setProgress(0);

	var output = [];

	fs.readFile(path, { encoding: 'utf-8'}, function (err, data) {

		if (err) {
			return fn(err, null);
		}

		parse(data, {
			columns: ['URL', 'Elements']
		}, function (err, data) {

			if (err) {
				return fn (err, null);
			}

			var proms = [];
			data.shift();

			var total = data.length + 1;
			var curr = 0;


			data.forEach(function (record) {

				var url = record.URL;
				var elements = record.Elements.split('|').map(function (e) { return e.trim(); });



				proms.push($.get(url).done(function (page) {
					var $page = $(page);

					elements = elements.map(function (e) {
						return $('<div/>').append($page.find(e)).html()
							.replace(/\n/gi, '')
							.replace(/,/gi, '&comma;');
					});

					elements.unshift(url);
					output.push(elements);

					curr++;

					l.setProgress(total / curr);

				}).fail(function () {
					log(arguments);
				}));
			});

			$.when.apply($, proms).done(function () {

				l.stop();

				stringify(output, function(err, stuff){

					if (err) {
						return fn(err, null);
					}

					fn(null, stuff)

				});
			});


		});

	});


}

function log(d) {
	d = JSON.stringify(d);
	alert(d);
	//process.stdout.write(d + '\n');
}
