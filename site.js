
// Javascript controlled by Hakan Bilgin (c) 2013

var finder = {
	init: function() {
		this.start();
		this.dnd.init();
	},
	dnd: {
		init: function() {
			$('.obstacle, .start, .end').bind('mousedown', this.do_event);
			$('.line').bind('mouseover mouseout', this.do_event);
		},
		do_event: function(event) {
			var dnd = finder.dnd,
				el = $(this),
				dim,
				top,
				left;
			switch (event.type) {
				case 'mouseout':
					$(event.target).removeClass('hover');
					break;
				case 'mouseover':
					$(event.target).addClass('hover');
					break;
				case 'mousedown':
					dim = finder.getDim(this);
					dnd.diff = {
						y: event.clientY - dim.t,
						x: event.clientX - dim.l
					};
					dnd.el = el;

					$(document).bind('mousemove mouseup', dnd.do_event);
					break;
				case 'mousemove':
					top = event.clientY - dnd.diff.y;
					left = event.clientX - dnd.diff.x;
					dnd.el.css({
						'top': Math.round(top/10) * 10,
						'left': Math.round(left/10) * 10
					});
					// find path on mouse up
					finder.start();
					break;
				case 'mouseup':
					$(document).unbind('mousemove mouseup', dnd.do_event);
					break;
			}
		}
	},
	start: function() {
		this.start_el  = this.start_el || $('.start');
		this.end_el    = this.end_el || $('.end');
		this.obst_el   = this.obst_el || $('.obstacle');
		this.line_size = this.line_size || $('.line', this.start_el).width();
		this.distance  = 10;
		this.obstacles = [];
		
		var start = this.getDim( this.start_el[0] ),
			end = this.getDim( this.end_el[0] ),
			i=0,
			il=this.obst_el.length;

		// populate obstacle array
		for (; i<il; i++) {
			if ( this.getStyle( this.obst_el[i], 'display' ) === 'none' ) continue;
			this.obstacles.push( this.getDim( this.obst_el[i] ) );
		}
		// path with start & end positions
		this.path = [
			[start.l+5, start.t+5],
			[end.l+5, end.t+5]
		];
		this.rec_count = 0;
		this.search();
	},
	sort_by: function(dir) {
		switch(dir) {
			case 1: return function(a,b) { return a[1] > b[1]; };
			case 2: return function(a,b) { return a[0] > b[0]; };
			case 3: return function(a,b) { return a[1] < b[1]; };
			case 4: return function(a,b) { return a[0] < b[0]; };
		}
	},
	get_dir_matrix: function( pos_A, pos_B, exclude_dir ) {
		var path      = this.path,
			obst      = this.obstacles,
			dist_size = this.distance + (this.line_size / 2),
			omega_pos = path[path.length-1],
			c0 = pos_B[0]  -  pos_A[0] < pos_A[1] - pos_B[1],
			c1 = pos_B[0]  -  pos_A[0] < pos_B[1] - pos_A[1],
			c2 = pos_A[0]  <  pos_B[0],
			c3 = pos_A[1]  >  pos_B[1],
			c4 = pos_A[1] === pos_B[1],
			c5 = pos_A[0] === pos_B[0],
			mtrx = [],
			col,
			i, k, kl;

		// create matrix	
		for (i=1; i<5; i++) {
			mtrx.push( [0,i] );
		}
		// start valuing directions
		switch ( true ) {
			case  c2 &&  c3 : mtrx[ ( c0 ? 1 : 2 ) - 1 ][0] += 3; break;
			case  c2 && !c3 : mtrx[ ( c1 ? 3 : 2 ) - 1 ][0] += 3; break;
			case !c2 && !c3 : mtrx[ ( c0 ? 4 : 3 ) - 1 ][0] += 3; break;
			case !c2 &&  c3 : mtrx[ ( c1 ? 4 : 1 ) - 1 ][0] += 3; break;
			case  c4        : mtrx[ ( c2 ? 2 : 4 ) - 1 ][0] += 3; break;
			case  c5        : mtrx[ (!c3 ? 3 : 1 ) - 1 ][0] += 3; break;
		}
		// check obstacles
		for (i=1; i<5; i++) {
			for (k=0, kl=obst.length; k<kl; k++) {
				col = false;
				switch ( i ) {
					case 1:
						if ( pos_A[1] >= obst[k].t &&
							 pos_A[1] <= obst[k].b + dist_size &&
							 pos_A[0] >  obst[k].l &&
							 pos_A[0] <  obst[k].r ) col = obst[k];
						break;
					case 2:
						if ( pos_A[0] < obst[k].r &&
							 pos_A[0] >= obst[k].l - dist_size &&
							 pos_A[1] >  obst[k].t - dist_size &&
							 pos_A[1] <  obst[k].b ) col = obst[k];
						break;
					case 3:
						if ( pos_A[1] >= obst[k].t - dist_size &&
							 pos_A[1] <= obst[k].b &&
							 pos_A[0] >  obst[k].l &&
							 pos_A[0] <  obst[k].r ) col = obst[k];
						break;
					case 4:
						if ( pos_A[0] <= obst[k].r + dist_size &&
							 pos_A[0] >= obst[k].l &&
							 pos_A[1] >  obst[k].t - dist_size &&
							 pos_A[1] <  obst[k].b ) col = obst[k];
						break;
				}
				if ( col ) break;
			}
			if ( col ) {
				c0 = ( i + 1 ) % 2;
				c1 = i % 2;
				c2 = pos_A[ c0 ] < pos_B[ c0 ];
				c3 = ( c1 === 1 ) ? Math.abs( pos_A[0] - col.l ) < Math.abs( pos_A[0] - col.r ) :
									Math.abs( pos_A[1] - col.t ) > Math.abs( pos_A[1] - col.b );
				c4 = ( c2 || c3 ) ? 3 : 1;

				mtrx[ c1 + c4 - 1 ][0] += 2;
				mtrx[i-1][0] = -90;
			} else {
				mtrx[i-1][0] += 2;
			}
		}
		// if in arguments, exclude dir
		switch ( exclude_dir ) {
			case 1: mtrx[2][0] = -90; break;
			case 2: mtrx[3][0] = -90; break;
			case 3: mtrx[0][0] = -90; break;
			case 4: mtrx[1][0] = -90; break;
		}
		// sort matrix for further processing
		mtrx.sort( this.sort_by(4) );

		// if there is a collision object, calculate next target
		if ( pos_A.length > 3 ) {
			// calculate look-ahead position
			switch ( mtrx[0][1] ) {
				case 1: mtrx[0][2] = [ pos_A[0], pos_A[3].t - dist_size ]; break;
				case 2: mtrx[0][2] = [ pos_A[3].r + dist_size, pos_A[1] ]; break;
				case 3: mtrx[0][2] = [ pos_A[0], pos_A[3].b + dist_size ]; break;
				case 4: mtrx[0][2] = [ pos_A[3].l - dist_size, pos_A[1] ]; break;
			}
			// direction matrix for look-ahead
			c0 = this.get_dir_matrix( mtrx[0][2], omega_pos, exclude_dir );
			// set direction for look-ahead
			mtrx[0][2][2] = c0[0][1];
		}
		return mtrx;
	},
	rec_count: 0,
	search: function(pos_A, pos_B) {
		var path       = this.path,
			obst       = this.obstacles,
			dist_size  = this.distance + (this.line_size / 2),
			omega_pos  = path[path.length-1],
			collisions = [],
			col,
			matrix,
			pos_index,
			target,
			s1, s2;
		// break out of recursion
		if ( this.rec_count++ > 40 ) return;

		// when search started, no arguments are passed
		if ( !pos_A && !pos_B ) {
			pos_A = path[0];
			pos_B = omega_pos;
		}
		
		// if point has no direction
		if ( !pos_A[2] ) {
			// get direction matrix
			matrix = this.get_dir_matrix( pos_A, pos_B );
			// set direction for position
			pos_A[2] = matrix[0][1];
			// re-process path
			return this.search( pos_A, pos_B );
		}

		// position A index
		pos_index = path.indexOf( pos_A );

		// look for collisions
		for (var i=0, il=obst.length; i<il; i++) {
			switch ( pos_A[2] ) {
				case 1: // up
					if ( pos_A[0] > obst[i].l - dist_size && 
						 pos_A[0] < obst[i].r + dist_size &&
						 pos_A[1] > obst[i].b &&
						 pos_B[1] < obst[i].b ) {
						// store collision object in position
						collisions.push( [ pos_A[0], obst[i].b + dist_size, false, obst[i] ] );
					}
					break;
				case 2: // right
					if ( pos_A[1] > obst[i].t - dist_size && 
						 pos_A[1] < obst[i].b + dist_size &&
						 pos_A[0] < obst[i].l &&
						 pos_B[0] > obst[i].l ) {
						// store collision object in position
						collisions.push( [ obst[i].l - dist_size, pos_A[1], false, obst[i] ] );
					}
					break;
				case 3: // down
					if ( pos_A[0] > obst[i].l - dist_size && 
						 pos_A[0] < obst[i].r + dist_size &&
						 pos_A[1] < obst[i].t &&
						 pos_B[1] > obst[i].t ) {
						// store collision object in position
						collisions.push( [ pos_A[0], obst[i].t - dist_size, false, obst[i] ] );
					}
					break;
				case 4: // left
					if ( pos_A[1] > obst[i].t - dist_size && 
						 pos_A[1] < obst[i].b + dist_size &&
						 pos_A[0] > obst[i].r &&
						 pos_B[0] < obst[i].r ) {
						// store collision object in position
						collisions.push( [ obst[i].r + dist_size, pos_A[1], false, obst[i] ] );
					}
					break;
			}
		}
		// if there is collision(s)
		if ( collisions.length ) {
			// sort collisions depending on the direction
			collisions.sort( this.sort_by( pos_A[2] ) );
			// process the nearest collision
			col = collisions.shift();
			// get direction matrix for collision
			matrix = this.get_dir_matrix( col, pos_B, pos_A[2] );
			// set direction for current position
			col[2] = matrix[0][1];
			// add current position to path
			path.splice( pos_index+1, 0, col );
			// since there is a collision, get "look-ahead suggestion" from the matrix
			target = matrix[0][2];
			// re-process path
			return this.search( path[ pos_index+1 ], target );

		} else if (path.indexOf( pos_B ) === -1) {

			if ( path[ pos_index ][2] === pos_B[2] ) {
				// no need to add new position
				s1 = ( pos_B[2] + 1 ) % 2;
				// extend the previous
				path[ pos_index ][ s1 ] = pos_B[ s1 ];
				// update search position
				pos_B = path[ pos_index ];
			} else {
				// add target position to path
				path.splice( pos_index+1, 0, pos_B );
			}
			
			// re-process path
			return this.search( pos_B, omega_pos );
		}

		s1 = ( pos_A[2] + 1 ) % 2;
		if ( pos_A[ s1 ] !== pos_B[ s1 ] ) {
			// prepare target position
			s2 = pos_A[2] % 2;
			target = [];
			target[ s1 ] = pos_A[ s1 ];
			target[ s2 ] = pos_B[ s2 ];

			// get direction matrix for target position
			matrix = this.get_dir_matrix( target, pos_B, pos_A[2] );
			// set direction for position
			target[2] = matrix[0][1];
			// re-process path
			return this.search( pos_A, target );
		}

		this.draw_path();
	},
	draw_path: function() {
		var path = this.path,
			otag = [],
			etag = [],
			dir, prop, val, str, s2;
		for (var i=0, il=path.length-1; i<il; i++) {
			// remove collision object references
			path[i].splice(3);

			switch ( path[i][2] ) {
				case 1: dir = 'up';    prop = 'height'; val = path[i][1] - path[i+1][1]; s2 = '<span>'+ path[i+1][0] +','+ path[i+1][1] +'</span><span>'+ path[i][0] +','+ path[i][1] +'</span>'; break;
				case 2: dir = 'right'; prop = 'width';  val = path[i+1][0] - path[i][0]; s2 = '<span>'+ path[i][0] +','+ path[i][1] +'</span><span>'+ path[i+1][0] +','+ path[i+1][1] +'</span>'; break;
				case 3: dir = 'down';  prop = 'height'; val = path[i+1][1] - path[i][1]; s2 = '<span>'+ path[i][0] +','+ path[i][1] +'</span><span>'+ path[i][0] +','+ path[i+1][1] +'</span>'; break;
				case 4: dir = 'left';  prop = 'width';  val = path[i][0] - path[i+1][0]; s2 = '<span>'+ path[i+1][0] +','+ path[i][1] +'</span><span>'+ path[i][0] +','+ path[i][1] +'</span>'; break;
			}
			str = '<div class="line '+ dir +'" style="'+ prop +': '+ val +'px;">'+ s2;
			
			otag.push( str );
			etag.push( '</div>' );
		}
		this.start_el.html( otag.join('') + etag.join('') );

		console.log( 'end', path );
	},
	getDim: function(el, a, v) {
		a = a || 'nodeName';
		v = v || 'BODY';
		var p = {w:el.offsetWidth, h:el.offsetHeight, t:0, l:0, obj:el};
		while (el && el[a] != v && (el.getAttribute && el.getAttribute(a) != v)) {
			if (el == document.firstChild) return null;
			p.t += el.offsetTop - el.scrollTop;
			p.l += el.offsetLeft - el.scrollLeft;
			if (el.scrollWidth > el.offsetWidth && el.style.overflow == 'hidden') {
				p.w = Math.min(p.w, p.w-(p.w + p.l - el.offsetWidth - el.scrollLeft));
			}
			el = el.offsetParent;
		}
		p.b = p.t + p.h;
		p.r = p.l + p.w;
		return p;
	},
	getStyle: function(el, name) {
		name = name.replace(/([A-Z]|^ms)/g, "-$1" ).toLowerCase();

		var value = document.defaultView.getComputedStyle(el, null).getPropertyValue(name);
		if (name === 'opacity' && getStyle(el, 'display') === 'none') {
			el.style.display = 'block';
			el.style.opacity = '0';
			value = '0';
		}
		if (value === 'auto') {
			switch (name) {
				case 'top': value = el.offsetTop; break;
				case 'left': value = el.offsetLeft; break;
				case 'width': value = el.offsetWidth; break;
				case 'height': value = el.offsetHeight; break;
			}
		}
		return value;
	}
};

$(document).ready(function() {
	finder.init();
});
