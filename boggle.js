//TODO
//display results
//add common words
//flashy ui when type in word
//give boards with lots of words
//refactor to reduce use of global variables by using classes
//implement in node js for multiplayer!
//
//
//SOWPODS.includes takes on average about .888ms
//the binary search method takes roughly .0001ms
//
//

// don't show timers if this is 1, 0 otherwise
var dev_mode = 0,
	//add text box and score at end
	singleplayer = 1,
	//put bounding boxes on the letters
	//if this isn't working look at fill-opacity!
	bbox_disp = false,
	//how much extra bit is there on the bbox vertically (find out later)
	bbox_lip = 0, 
	//and for the Qu piece
	bbox_Qu_lip = 0,
	//make it more real
	rotation = false,
	//how many rows/cols
	game_size = 4,
	gameSquare = game_size*game_size,
	//width of the dice
	cell_dim = 50,
	// game time (in seconds) *at least 1*
	game_time = 3*60;
	// countdown time (in seconds) 
	countdown_time = 3,
	// time in between timer updates (29 to make look random)
	time_update = 1000,
	//background colour
	backg_colour = "Ghostwhite",
	dice_backg_colour = "white",
	// is a game in progress?
	game_in_progress = false,
	// add this in the x dir
	x_pad = 10,
	// and this in the y dir
	y_pad = 10,
	// words entered
	word_list = [],
	// SOWPODS length
	dLength = SOWPODS.length,
	// an array of coords
	coords = [],
	//stores characters in board
	letter_data = [],
	//neighbour data
	neibList = [],
	// score
	game_score = 0;

var table = new Table();

var Dice = [
	["T", "O", "E", "S", "S", "I"],
	["E", "I", "U", "N", "E", "S"],
	["A", "E", "A", "N", "E", "G"],
	["O", "W", "T", "O", "A", "T"],
	["E", "R", "T", "T", "Y", "L"],
	["W", "N", "G", "E", "E", "H"],
	["T", "S", "T", "I", "Y", "D"],
	["T", "E", "R", "W", "H", "V"],
	["L", "R", "E", "I", "X", "D"],
	["I", "O", "T", "M", "U", "C"],
	["R", "Y", "V", "D", "E", "L"],
	["A", "H", "S", "P", "C", "O"],
	["L", "N", "H", "N", "R", "Z"],
	["O", "B", "J", "O", "A", "B"],
	["N", "U", "I", "H", "M", "QU"],
	["A", "S", "P", "F", "F", "K"]
]

//order by corners, then edges, then center
var fast_lookup = [0, 3, 12, 15, 1 , 2, 4, 7, 8, 11, 13, 14, 5, 6, 9, 10];

function startup() {
	//runs once at startup
	
	//text for the timer
	document.getElementById("timer").innerHTML = game_time;
	//focus on the start button
	document.getElementById('startButton').focus();
	if (singleplayer) {
		d3.select("#score").html("score: " + game_score);
	}
	table.addHeader();

	//set up variables
	preCompute();
	//setup the main svg element
	var svg = d3.select( ".thedice" )
		.append( "svg" )
		.attr( "transform", "translate(0,0)")
		.attr( "width", cell_dim*game_size+x_pad*2 )
		.attr( "height", cell_dim*game_size+y_pad*2 );

	//set the background colour
	d3.select("body").style("background-color", backg_colour )

	//position the countdown timer
	d3.select("#countdown")
		.style("top", "50px")
		.style("left", "250px") 

	//hide the "show letters button"
	// d3.select("#showLetterButton").style("visibility", "hidden")
	d3.select("#showLetterButton").attr("disabled", "disabled")

	//build the dice
	svg.selectAll( "rect" )
		.data( coords ).enter()
		.append( "rect" )
		.attr( "id", function(d, i) { return "d" + String(i) } )
		.attr( "die_x", function(d) { return d.x } )
		.attr( "die_y", function(d) { return d.y } )
		.attr( "class", "dice")
		.attr( "fill-opacity", 1 )
		.attr( "width", cell_dim )
		.attr( "height", cell_dim )
		.attr( "style", "stroke: gray")
		.attr( "rx", cell_dim*.2 )
		.attr( "ry", cell_dim*.2 )		
		.attr( "fill", dice_backg_colour )
		.attr( "x", function(d){ return x_pad + d.x*cell_dim } )
		.attr( "y", function(d){ return y_pad + d.y*cell_dim } );

	//build the letters
	svg.selectAll( "text" )
		.data( coords ).enter()
		.append( "text" )
		.attr( "letter_id", function(d, i) { return "l" + String(i) } )
		.attr( "letter_x", function(d) { return d.x } )
		.attr( "letter_y", function(d) { return d.y } )
		.attr( "class", "letter")
	//.attr( "text-anchor", "middle")
		.attr( "width", cell_dim )
		.attr( "height", cell_dim )
		.text( function(d, i){ return ' ' })
		.attr( "x", function(d){ return x_pad + d.x*cell_dim + (cell_dim / 2) } )
		.attr( "y", function(d){ return y_pad + d.y*cell_dim + (cell_dim / 2) } );


	//quick test to work out 'lip', i.e. how far the bbox overestimates in the y dir
	//instead of measuring once do this here - fontsize etc. could change.

	//place a test letter fist
	svg.append("text").html("A").attr("class", "letter").attr("id", "testletter")
		.attr("y", cell_dim).attr("x", cell_dim)

	//select it
	var letter = d3.select("#testletter");
	var bbox = letter.node().getBBox();
	bbox_lip = bbox.y - letter.attr("y") + bbox.height;

	//don't need this letter anymore
	letter.remove()

	//now do the same for "Qu"
	svg.append("text").html("Qu").attr("class", "letter").attr("id", "Qu_letter")
		.attr("y", cell_dim).attr("x", cell_dim)

	//select it
	var letter = d3.select("#Qu_letter");
	var bbox = letter.node().getBBox();
	bbox_Qu_lip = bbox.y - letter.attr("y") + bbox.height;

	//don't need this letter anymore
	letter.remove()

	//just go ahead if dev_mode is on.
	if ( dev_mode == 1) {
		init()
	}
}

function preCompute() {
	//this function runs at startup and precomputes various
	//data to speed up validity checks later
	var i,j;

	letter_data.push(d3.range(game_size));

	for (j = 0; j < game_size; j++) {
		letter_data[j] = [];
		letter_data[j].push(d3.range(game_size));
	}

	//set up coords array
	for (i = 0; i < game_size; i++) {
		for (j = 0; j < game_size; j++) {
			coords.push({
				x: i,
				y: j
			})
		}
	}
	
	//precompute neighbour data
	neibList.push(d3.range(game_size));
	for (j = 0; j < game_size; j++) {
		neibList[j] = [];
		neibList[j].push(d3.range(game_size));
	}
	for (i = 0; i < game_size; i++) {
		for (j = 0; j < game_size; j++) {
			neibList[i][j] = neighbours({x: i, y: j});
		}
	}

}

function assign_letter( die ) {
	return Dice[die][Math.floor(Math.random()*(6))];
}

function Table() {
	this.clearRows = function() {
		d3.selectAll(".rowword").remove();
	};
	this.addHeader = function() {
		var table = d3.select("#table");
// 
		// var row = table.insert("div",":first-child").attr("class", "headTableRow");
// 
		// row.append("div")
			// .attr("class", "headwordCell")	
			// .html("word");
// 
		// row.append("div")
			// .attr("class", "headscoreCell")	
			// .html("score");
	};

	this.addRow = function(data) {
		//data has properties word and score

		var score_css = "score_" + data.score;
		var table = d3.select("#table");
		var row = table.insert("div",":first-child").attr("class", "divTableRow rowword " + score_css);

		row.append("div")
			.attr("class", "wordCell divTableCell")	
			.html(data.word);

		row.append("div")
			.attr("class", "scoreCell divTableCell")	
			.html(data.score);
	};
}

function perm( arr ){
	//this function returns a random permutation of the supplied array
	var N = arr.length;
	out = [];
	for (i = 0; i < N; i++) {
		var index = Math.floor(Math.random()*(N-i));
		out.push(arr[index]);
		arr.splice(index, 1);
	}
	return out;
}

function drawBoard( rotation ) {
	//this function rolls the dice, assigns and aligns the letters on the board
	var die_choice = perm( d3.range(16) );

	//get the letters
	for (i = 0; i < game_size; i++) {
		for (j = 0; j < game_size; j++) {
			letter_data[i][j] = assign_letter( die_choice[game_size*i + j] )
		}
	}

	//remove any old "Qu" tags
	d3.select("#Qu_letter").attr("id", null)

	//assign letters
	d3.selectAll( ".letter" )
		.each(function(d, i){
			d3.select(this)
				.text( function(d){ return letter_data[coords[i].x][coords[i].y] })
			//see if it is a "Qu"
				.attr("id", function(d) {
					if (letter_data[coords[i].x][coords[i].y] == "QU" ) {
						return "Qu_letter"
					} else {
						return null
					}
				})	
		});

	//make sure "QU" is displayed as "Qu"
	d3.select("#Qu_letter").text("Qu");
	/*
			if you don't use coords in above:
			letter_data[(i - (i % game_size))/game_size][i % game_size]
			*/	

	//clear old bboxes, if they exist
	d3.selectAll(".bbox").remove()

	//now move the letters
	d3.selectAll( ".letter" )
		.each(function(d, i){
			var selection = d3.select(this);

			var bbox = selection.node().getBBox();
			selection.attr( "x" , function(d){ return x_pad + coords[i].x*cell_dim + (cell_dim / 2) - bbox.width / 2  } )
			//this bit depends if it is a Qu or not
			if (selection.attr("id") === "Qu_letter") {
				selection.attr( "y" , function(d){ return y_pad + coords[i].y*cell_dim + (cell_dim + bbox.height - 2*bbox_Qu_lip)/2 } )
			} else {
				selection.attr( "y" , function(d){ return y_pad + coords[i].y*cell_dim + (cell_dim + bbox.height - 2*bbox_lip)/2 } )				
			}

			//are we showing the bounding boxes
			if (bbox_disp) {
				//find them again since the letter moved
				bbox = selection.node().getBBox();
				d3.select("svg").insert("rect", ":first-child")
					.attr( "class", "bbox")
					.attr( "bbox_coord", i )
					.attr( "x", bbox.x )
					.attr( "y", bbox.y )
					.attr( "width", bbox.width )
					.attr( "height", bbox.height )
					.attr( "fill", "Olive" )
					.attr( "fill-opacity", 0.4 )
			}
		});

	//rotate them if nec
	if (rotation) {
		function rotate_string ( deg, x, y ) { return "rotate(" +   String(deg) + "," + String(x) + "," +  String(y) + ")"}

		var rotate_array = [];
		for (i=0; i<game_size*game_size; i++) { rotate_array.push((Math.floor(Math.random()*4) % 4 )*90) }
		d3.selectAll( ".letter" )
			.each(function(d, i){
				d3.select(this)
					.attr( "transform", rotate_string(
						rotate_array[i], x_pad + coords[i].x*cell_dim + (cell_dim / 2), y_pad + coords[i].y*cell_dim + (cell_dim / 2))
					)
			});	
		//also rotate the bboxes, why not.
		d3.selectAll( ".bbox" )
			.each(function(d){
				var i = d3.select(this).attr( "bbox_coord" );
				d3.select(this)
					.attr( "transform", rotate_string(
						rotate_array[i], x_pad + coords[i].x*cell_dim + (cell_dim / 2), y_pad + coords[i].y*cell_dim + (cell_dim / 2))
					)					
			});
	} else { 
		//reset any rotation info
		d3.selectAll(".bbox, .letter").attr("transform", null )
	}
}

function init() {
	//runs once the again button is pressed

	//if singleplayer clear word list and display
	if (singleplayer) {
		game_score = 0;
		word_list = [];
		table.clearRows();
		d3.select("#textbox").attr("disabled", null);
		//set focus to textbox
		document.getElementById('textbox').focus();
		d3.select("#score").html("score: " + game_score);
	}

	//get timer text ready
	document.getElementById("timer").innerHTML = game_time;
	//hide the showletter button	
	d3.select("#showLetterButton").attr("disabled", "disabled");
	// d3.select("#showLetterButton").style("visibility", "hidden")
	//disable the start button
	d3.select("#startButton").attr("disabled", "disabled");
	if (dev_mode === 0) { 
		document.getElementById("countdown").innerHTML = countdown_time
	}

	//do the board
	//setLettersColour( backg_colour );
	setLettersColour( "black" );
	//drawBoard( true )

	//countdown
	var t = 0;
	if (dev_mode === 0 ) {
		var timer_id = setInterval(function(){
			document.getElementById("countdown").innerHTML = Math.ceil(countdown_time - t/1000);
			drawBoard( true )
			t = t + 100;
			if (t > countdown_time*1000) {
				clearInterval(timer_id)
				document.getElementById("countdown").innerHTML = "";
				startNewGame();
			}
		}, 100);
	} else {
		startNewGame();
	}
	//setTimeout(startNewGame, countdown_time*1000*(1-dev_mode));
}

function startNewGame() {
	//display timer at max time
	document.getElementById("timer").innerHTML = game_time;
	//show the letters
	setLettersColour ( "black" );

	//set the board
	drawBoard( rotation );

	//game in progress now
	game_in_progress = true;
	//timer code:

	//time variable, time elapased in milliseconds
	if ( dev_mode === 0 ) {
		var t = 1000;
		var timer_id = setInterval(function(){
			// use this when you want finer control
			// document.getElementById("timer").innerHTML = (game_time - t/1000).toFixed(2);
			document.getElementById("timer").innerHTML = (game_time - t/1000);
			t = t + time_update;
			//check if game over yet
			if (t > game_time*1000) {
				clearInterval(timer_id);
				document.getElementById("timer").innerHTML = "Game Over!";
				endGame();
			}
		}, time_update);
	} else {
		endGame();
	}
}

function endGame() {
	game_in_progress = false;
	d3.select("#startButton").attr("disabled", null)
	d3.select("#startButton").html("Again!")
	document.getElementById('startButton').focus();
	if ( dev_mode === 1 ) {
		//dev_mode code
	} else if ( singleplayer === 0 ) {
		//this runs as soon as the game is over (normal mode)
		// d3.select("#showLetterButton").style("visibility", "visible")
		d3.select("#showLetterButton").attr("disabled", null)
		setLettersColour( dice_backg_colour );
	} else {
		d3.select("#textbox").attr("disabled", "disabled");
		//singleplayer mode
		singleplayer_score();
	}
}

function showLetterButton() {
	//called by the show letter button
	setLettersColour( "black" )

	//hide once clicked
	// d3.select("#showLetterButton").style("visibility", "hidden")
	d3.select("#showLetterButton").attr("disabled", null)
}

function isAlpha(str) {
  return /^[a-zA-Z]+$/.test(str);
}

function dict_check( word ) {
	//is the word in the dictionary?
	return bSearch( word.toLowerCase(), 0, dLength - 1);
}

function bSearch( word, lower, upper) {
	if (lower == upper) {
		return SOWPODS[lower] == word;
	} 

	var mid = Math.floor((lower+upper) / 2);

	if (SOWPODS[mid] < word) {
		return bSearch(word, mid+1, upper);
	} else {
		return bSearch(word, lower, mid);
	}
	
}
function includesBin(){
	for (i in SOWPODS){
		if(!SOWPODS.includes(SOWPODS[i])) {console.log("oops!!")};
	}
	console.log("done!!");
}
function isSorted(list){
	var l = list.length;
	var i =0;
	for (i=0; i< l-1;i++){
		if (list[i+1]<list[i])
		{
			console.log("look at index " + i);
		}
	}
}
function benchBin(){
	for (i in SOWPODS){
		if(!bSearch(SOWPODS[i], 0, dLength - 1)) {console.log("failed on " + SOWPODS[i])};
	}
	console.log("done!!");
}
function score_word( word_length ) {
	//score a word
	switch (word_length)
	{
		case 2:
			return 0;
		case 3:
		case 4:
			return 1;
		case 5:
			return 2;
		case 6:
			return 3;
		case 7:
			return 5;
		default:
			return 11;
	}
}

function singleplayer_score() {
	//runs at end in singleplayer mode
	d3.select("#score").html("Final score: " + game_score);
}

function setLettersColour( colour ) {
	d3.selectAll(".letter").style("fill", colour);
}

function setDiceColour( colour, i ) {
	d3.selectAll(".dice").attr("fill", colour );
}

function setDiceColourbyID( colour, i ) {
	d3.select("#d" + i).attr("fill", colour );
}

function setDiceColourbyXY( colour, x, y) {
	d3.select("rect[die_x='" + String(x) + "'][die_y='" + String(y) + "']")
		.attr("fill", colour)
}

function handle(e){
	if(e.keyCode === 13){
		e.preventDefault(); // Ensure it is only this code that runs (?)
		//get candidate string
		var input = d3.select("#textbox").node().value.toLowerCase();
		//check if already have it
		d3.select("#textbox").node().value = "";
		if (!game_in_progress) {
			return;
		}
		for (index in word_list) {
			if(word_list[index].word == input) {
				return;
			}

		}
		//check valid word
		if ( isAlpha( input ) ) {
			if ( recursiveCheckValid( input ) ) {
				if ( dict_check( input ) ) {
					let word = {word: input, score: score_word( input.length )};
					table.addRow(word);
					word_list.push(word);
					game_score += word.score;
					d3.select("#score").html("score: " + game_score);
				}
			}
		}
	}
}

function neighbours( p ) {
	//this takes as input a point in the board
	//and returns a list of all neighbours,
	//(not including the point)
	//potentially precompute this?
	var out = [];
	var i = 0;
	var j = 0;
	for (i=-1; i<=1; i++) {
		for (j=-1; j<=1; j++) {
			if ( i == 0 && j == 0) { continue }
			var testp = { x: p.x + i, y: p.y + j };
			if (0 <= testp.x && testp.x < game_size && 0 <= testp.y && testp.y < game_size) {
				out.push(testp);
			}
		}			
	}
	return out;	
}

function preComputedNeibs( p ){
	//this just accesses the precomputed array
	return neibList[p.x][p.y];
}

function areAdj( p1, p2 ) {
	//this takes two points on the board and
	//returns true or false if they are adjacent or not
	//also returns false if they are equal.
	var dx = Math.abs(p1.x - p2.x),
		dy = Math.abs(p1.y - p2.y);
	if ( dx	> 1 || dy > 1 ) {
		return false;
	} else	if ( dx + dy > 0) {
		return true;
	}
	return false;
}	

function pEq( p1, p2) {
	//are two points equal
	var dx = Math.abs(p1.x - p2.x),
		dy = Math.abs(p1.y - p2.y);
	if (dx == 0 && dy == 0) {
		return true;
	} else {
		return false;
	}
}

function distinctPoints( array ) {
	//checks whether the elements of an array are all distinct.
	var l = array.length;
	if (l == 1) {return true }
	var i = 0;
	var j = 0;
	for (i = 0; i < l - 1; i++) {
		for (j = i + 1; j < l; j++) { 
			if (pEq (array[i], array[j])) {
				return false;
			}
		}
	}
	return true;
}

function isPath( points, l ) {
	//this function takes an (ordered) list of points
	//and checks if it is a valid path in the boggle board:
	//e.g. no gaps, no repititions.
	//for any i, expect points[i] to have x and y properties.
	if (l == 1) {return true}
	if (!distinctPoints(points)) {
		return false
	}
	for (i=0; i+1<l; i++) {
		if (areAdj(points[i], points[i+1])) {
			continue
		}
		else {
			return false
		}
	}
	return true;
}

function hilight( points, colour ) {
	//takes as input a list of points (may not be a path!)
	// and hilights with colour given
	var l = points.length;
	for (i=0; i<l; i++ ) {
		setDiceColourbyXY( colour, points[i].x, points[i].y );
	}
}

//not sure if needed:
//function clear_hilight

function letterOnBoard( letter ) {
	//simply returns T/F depending on whether
	//the letter is present on the board
	var i = 0;

	for (i = 0; i < gameSquare; i++) {
		if ( letter_data[coords[i].x][coords[i].y] == letter ) {
			return true;
		}
	}
	return false;
}

function lettersOnBoard( letters, length ) {
	//simply returns T/F depending on whether
	//the letters are present on the board

	var i = 0;
	for (i = 0; i < length; i++) {
		if ( !letterOnBoard(letters[i]) ) {
			return false
		}
	}
	return true;
}
function wToList( word, l ) {
	//rewrites a word as a list, with Qu taking a single entry
	//assumes word is uppercase
	var i = 0,
		offset = 0,
		out = [];

	for(i=0;i+offset<l;i++){
		if (word[i + offset] == "Q" && i + offset + 1 < l){
			if (word[i + 1 + offset] == "U") {
				out[i] = word[i + offset] + word[1 + i + offset];
				offset += 1;
			} else {
				out[i] = word[i + offset];
			}
		} else {
			out[i] = word[i + offset];
		}
	}
	return out;
}

function recursiveCheckValid( word ) {
	//this is a recursive version of checkValid

	//first get length
	var l = word.length;
	if (l < 3 || l > 16) {
		return false;
	}
	//make any occurence of Qu a single index
	//and also capitalize
	if ( word.includes("q") ) {
		//only need to do this if there is actually a q
		word = wToList(word.toUpperCase(), l);
		//recompute length
		l = word.length;
	} else {
		word = word.toUpperCase();
	}

	//do we at least have the correct letters?
	if (!lettersOnBoard ( word, l )){
		return false;
	}

	//get possible starting points,
	//then immediately scan
	//(we know they exist)
	var sliceword = word.slice(1, l);
	var i = 0;
	for (i = 0; i < gameSquare; i++) {
		if ( letter_data[coords[i].x][coords[i].y] == word[0] ) {
			if (scanBoard ( sliceword, l - 1, [coords[i]], 1 )) {
				return true;
			}
		}
	}
	
	// //start the recursion at each starting point
	// for (i = 0; i < start_coords.length; i++) {
		// //depending on the return here decide whether or not to continue
		// if (scanBoard ( word.slice(1, l), l - 1, [start_coords[i]], 1 )) {
			// return true;
		// }
	// }
	//none of the scans returned true:
	return false;
}

function scanBoard( remWord, remWordLength, path, pathLength ) {
	//the recursive scanning function
	//remWord is the portion of the word we still need to place
	//fullWord is the whole word
	if (remWordLength == 0) {
		return true;
	}

	//get neighbours of letter we need to place
	//also filter the list so that we only get neibs with correct next letter
	var neibs = preComputedNeibs( path[pathLength - 1] ).filter( function(p) {
		return letter_data[p.x][p.y] == remWord[0];
	});
	
	// how may neighbours are there
	var w = neibs.length;

	if (w == 0){
		//no valid neighbours
		return false;
	}
	//otherwise scan through them

	var i = 0;
	for (i = 0; i < w; i++) {
		path.push(neibs[i]);
		//need to check if this is still a valid path
		if (isPath(path, pathLength + 1)) {
			//OK! let's go deeper...
			if(scanBoard( remWord.slice(1, remWordLength),
				remWordLength-1, path, pathLength + 1)) {
				return true;
			}
		}
		//didn't return true or was not path, try next
		path.pop();
	}
	//if we get this far then none of the new neibs made a path
	//or, they made paths but weren't valid deeper down
	return false;
}

