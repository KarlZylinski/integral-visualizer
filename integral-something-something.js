window.onload = function() {
    var canvas = document.getElementById("integral-canvas")
    var canvas_width = canvas.width
    var canvas_height = canvas.height
    var context = canvas.getContext("2d")
    var canvas_data = context.getImageData(0, 0, canvas_width, canvas_height)

    function draw_pixel (p, c) {
        if (p.x < 0 || p.x >= canvas_width || p.y < 0 || p.y >= canvas_height)
            return

        var index = (Math.floor(p.x) + Math.floor(p.y) * canvas_width) * 4
        canvas_data.data[index + 0] = c.r
        canvas_data.data[index + 1] = c.g
        canvas_data.data[index + 2] = c.b
        canvas_data.data[index + 3] = 255;
    }

    function clear_canvas() {
        context.fillStyle="#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        canvas_data = context.getImageData(0, 0, canvas_width, canvas_height);
    }

    function update_canvas() {
        context.putImageData(canvas_data, 0, 0)
    }

    function test_func(x) {
        return Math.cos(Math.pow(x, 2));
    }

    var grid_size;
    var origin_pixels;
    var origin;
    var grid_color;
    var axis_color;
    var x_step;
    
    function reload_parameters() {
        grid_size = vec(parseInt(document.getElementById("grid_size_x").value),
                        parseInt(document.getElementById("grid_size_y").value));
        x_step = parseFloat(document.getElementById("x_step").value)
        origin_pixels = vec(canvas_width/2, canvas_height/2);
        origin = vec(canvas_width/2/grid_size.x, canvas_height/2/grid_size.y);
        grid_color = color(230, 230, 230);
        axis_color = color(150, 150, 150);
    }

    reload_parameters();

    function draw_grid() {
        var nx = canvas_width/grid_size.x;
        var ny = canvas_height/grid_size.y;

        for (var x = -nx/2 + (origin_pixels.x % grid_size.x)/grid_size.x; x < nx/2; ++x) {
            draw_line(vec(x, -ny/2), vec(x, ny/2), grid_color);
        }

        for (var y = -ny/2 + (origin_pixels.y % grid_size.y)/grid_size.y; y < ny/2; ++y) {
            draw_line(vec(-nx/2, y), vec(nx/2, y), grid_color);
        }

        draw_line(vec(0, -ny/2), vec(0, ny/2), axis_color, 2);
        draw_line(vec(-nx/2, 0), vec(nx/2, 0), axis_color, 2);
    }

    function linspace(from, to, space) {
        var n = (to - from)/space;
        var ls = new Array(Math.floor(n));

        for (var i = 0; i < n + 1; ++i) {
            ls[i] = from + space * i;
        }
        return ls;
    }

    function vec(x, y) {
        return {x: x, y: y};
    }

    function vec_length(v1, v2) {
        var diff = vec_diff(v1, v2);
        return Math.sqrt(diff.x*diff.x + diff.y*diff.y);
    }

    function vec_diff(v1, v2) {
        return vec(v2.x - v1.x, v2.y - v1.y);
    }

    function vec_scale(v, s) {
        return vec(v.x * s, v.y * s);
    }

    function vec_elem_mult(v1, v2) {
        return vec(v1.x * v2.x, v1.y * v2.y);
    }

    function vec_add(v1, v2) {
        return vec(v1.x + v2.x, v1.y + v2.y);
    }

    function vec_scale_to_grid(v)
    {
        return vec_elem_mult(vec_add(v, origin), grid_size);
    }

    function color(r, g, b) {
        return {r: r, g: g, b: b};
    }

    function draw_line(unscaled_p1, unscaled_p2, c, thickness) {
        var p1 = vec_scale_to_grid(unscaled_p1);
        var p2 = vec_scale_to_grid(unscaled_p2);
        var dist = vec_length(p1, p2);
        var diff = vec_diff(p1, p2);
        var dir = vec_scale(diff, 1/dist);

        for (var i = 0; i < dist; ++i) {
            var p = vec_add(p1, vec_scale(dir, i));
            draw_pixel(p, c);
            if (thickness && thickness != 0) {
                var fur = thickness/3;
                draw_pixel(vec_add(p, vec(-fur, fur)), c);
                draw_pixel(vec_add(p, vec(fur, -fur)), c);
                draw_pixel(vec_add(p, vec(-fur, -fur)), c);
                draw_pixel(vec_add(p, vec(fur, fur)), c);
            }
        }
    }

    function fill_box(unscaled_p1, unscaled_p2, c) {
        var p1 = vec_scale_to_grid(unscaled_p1);
        var p2 = vec_scale_to_grid(unscaled_p2);
        var sx = Math.min(p1.x, p2.x);
        var ex = Math.max(p1.x, p2.x);
        var sy = Math.min(p1.y, p2.y);
        var ey = Math.max(p1.y, p2.y);

        for (var x = sx; x < ex; ++x) {
            for (var y = sy; y < ey; ++y) {
                draw_pixel(vec(x, y), c);
            }
        }
    }

    function draw_box(p1, p2, bg_color, line_color) {
        fill_box(p1, p2, bg_color);
        draw_line(p1, vec(p1.x, p2.y), line_color);
        draw_line(p1, vec(p2.x, p1.y), line_color);
        draw_line(p2, vec(p1.x, p2.y), line_color);
        draw_line(p2, vec(p2.x, p1.y), line_color);
    }

    function draw_riemann_sum(start, end, num_partitions, lower_sum) {
        var delta_x = (end - start)/num_partitions;
        var sum = 0;
        for (var p = 0; p < num_partitions; ++p) {
            var part_start = start + p * delta_x;
            var part_end = part_start + delta_x;
            var best_val = run_func(part_start);

            for (var i = part_start; i < part_end; i = i + x_step) {
                var val = run_func(i);

                if (lower_sum && val < best_val || !lower_sum && val > best_val) {
                    best_val = val;
                }
            }
            sum += best_val*delta_x;
            draw_box(vec(part_start, 0), vec(part_end, -best_val), color(230, 230, 255), color(0, 120, 255))
        }

        return sum;
    }

    function run_func(x) {
        return test_func(x);
    }

    function render() {
        reload_parameters();
        clear_canvas()
        draw_grid();
        var num_parts = document.getElementById("num_partitions").value;
        var use_lower =  document.getElementById("use_lower").checked;
        var lower_limit = parseFloat(document.getElementById("lower_limit").value);
        var upper_limit = parseFloat(document.getElementById("upper_limit").value);
        var sum = draw_riemann_sum(
            lower_limit,
            upper_limit,
            num_parts, use_lower);
        document.getElementById("signed_value").textContent  = sum;

        x_axis = linspace(lower_limit, upper_limit, x_step);
        var prev_x = x_axis[0];
        x_axis.forEach(function(x) {
            draw_line(vec(prev_x, -run_func(prev_x)),
                      vec(x, -run_func(x)),
                      color(33, 33, 33),
                      2);
            prev_x = x;
        });
        update_canvas()
    }

    function add_render_mouse_capture(element, func) {
        var elem = document.querySelector(element)
        
        elem.addEventListener("mousedown", function() {
            document.addEventListener("mousemove", func, true);
            
            function end_capture() {
                document.removeEventListener("mousemove", func, true);
                document.removeEventListener("mouseup", end_capture, true);
            };

            document.addEventListener("mouseup", end_capture, true);
        }, true);
    }

    add_render_mouse_capture("#num_partitions", render);
    document.getElementById("use_lower").onchange = render;
    document.getElementById("lower_limit").onchange  = render;
    document.getElementById("upper_limit").onchange = render;
    document.getElementById("x_step").onchange = render;
    add_render_mouse_capture("#grid_size_x", render);
    add_render_mouse_capture("#grid_size_y", render);

    render()
}