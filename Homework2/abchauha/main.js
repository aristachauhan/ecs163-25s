d3.csv("mxmh_survey_results.csv").then(regularData => {
    regularData.forEach(d => {
        d["Primary streaming service"] = ({
          "YouTube Music": "YouTube",
          "I do not use a streaming service.": "None",
          "Other streaming service" : "Other",
        }[(d["Primary streaming service"] || "").trim()] || (d["Primary streaming service"] || "").trim());
      
        d["Music effects"] = (d["Music effects"] || "").trim().toLowerCase();
      
        // convert csv string to number
        d["Hours per day"] = Number(d["Hours per day"]);
        d.BPM = Number(d.BPM);
        d.Age = Number(d.Age);
      });

    // filter for genre titles
    const genreColumns = regularData.columns;
    const genres = genreColumns.filter(col => col.includes("Frequency ["));
  
    // set chart size constraints
    const height = 385;
    const width = 385;
    const marginTop = 35;
    const marginBottom = 30;
    const marginLeft = 60;

    // filter out missing data and outliers
    const filteredData = regularData.filter(d => d.Age !== "" && d["Hours per day"] !== "" && 
    d.BPM !== "" && d.BPM < 800 && d["Primary streaming service"] !== "" && d["Music effects"] !== "" );

    // normalize data to whole hours and count the number of respondents 
    const hourC = filteredData.reduce((t, r) => {
      const hourRange = Math.ceil(r["Hours per day"]);
      t[hourRange] = (t[hourRange] || 0) + 1;
      return t;
    }, {});
  
    const hourData = Object.keys(hourC).map(hour => ({ hours: +hour, count: hourC[hour]}))
    const stdData = hourData.sort((a, b) => d3.ascending(a.hours, b.hours));
    
    // declare our window size
    const svg = d3.select("svg")
      .attr("width", 1465)
      .attr("height", 530);

    // set x
    const xScatter = d3.scaleLinear()
      .domain(d3.extent(stdData, d => d.hours))
      .range([0, width]);
  
    // set y
    const yScatter = d3.scaleLinear()
      .domain([0, d3.max(stdData, d => d.count)])
      .range([height, 0]);

    // render line
    const line = d3.line()
        .x(d => xScatter(d.hours))
        .y(d => yScatter(d.count))
    
    // format graph position
    const svgScatter = svg.append("g")
      .attr("transform", `translate(${marginLeft}, ${marginTop})`);

    // x-axis  
    svgScatter.append("g")
      .attr("transform", `translate(0, ${width})`)
      .call(d3.axisBottom(xScatter))
      .style("font-weight", "bold");
   
      // y-axis
    svgScatter.append("g")
      .call(d3.axisLeft(yScatter))
      .style("font-weight", "bold");
  
    // line graph title
    svgScatter.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width * .55)
      .attr("font-size", "17px")
      .style("font-weight", "bold")
      .text("Number of Hours vs. Number of Respondents");
  
    // x-axis title
    svgScatter.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width * .50)
      .attr("y", width  + 40)
      .style("font-weight", "bold")
      .text("Number of Hours Music is Listened to");
  
    // y-axis title 
    svgScatter.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -height * .5)
      .attr("y", -40)
      .style("font-weight", "bold")
      .text("Number of Respondents");
  
    // line rendering 
    svgScatter.append("path")
      .attr("stroke", "royalblue")
      .attr("fill", "none")
      .attr("stroke-width", 2.3)
      .attr("d", line(stdData));


    // Parallel Coordinate Graph //
  
    const dataAttributes = ["Age", "Hours per day", "BPM", "Primary streaming service"];
    const colors = "Music effects";
    
    // find the count for each effect category
    const counts = {};
    filteredData.forEach(d => {
      const effect = d[colors];
      counts[effect] = (counts[effect] || 0) + 1;
    });
    
    const yParallel = new Map();
    
    // mapping positions of lines in relation to y-axis
    yParallel.set("Age", d3.scaleLinear()
      .domain(d3.extent(filteredData, d => d.Age))
      .range([height - marginBottom, marginTop]));
    
    yParallel.set("Hours per day", d3.scaleLinear()
      .domain(d3.extent(filteredData, d => d["Hours per day"]))
      .range([height - marginBottom, marginTop]));
    
    yParallel.set("BPM", d3.scaleLinear()
      .domain(d3.extent(filteredData, d => d.BPM))
      .range([height - marginBottom, marginTop]));
    
    yParallel.set("Primary streaming service", d3.scalePoint()
      .domain([...new Set(filteredData.map(d => d["Primary streaming service"]))])
      .range([height - marginBottom, marginTop]));
    
    // set x
    const xParallel = d3.scalePoint()
      .domain(dataAttributes)
      .range([0, width]);
    
    // assign colors to effect
    const colorRange = d3.scaleOrdinal()
      .domain(["worsen", "no effect", "improve"])
      .range(["red", "orange", "deepskyblue"]);
    
    // makes lines 
    const parallelLine = d3.line()
      .defined(([, value]) => value != null)
      .x(([key]) => xParallel(key))
      .y(([key, value]) => yParallel.get(key)(value));
    
   // graph positioning
   const parallelBlock = svg.append("g")
        .attr("transform", `translate(${width + 129}, ${marginTop})`);

    // line styling
    parallelBlock.selectAll(".parallel-line")
    .data(filteredData).enter().append("path")
    .attr("class", "parallel-line")
    .attr("fill", "none")
    .attr("stroke", d => colorRange(d[colors]))
    .attr("stroke-opacity", 0.7)
    .attr("stroke-width", 2)
    .attr("d", d => parallelLine(dataAttributes.map(key => [key, d[key]])));

    // positions the axis lines
    const axis = parallelBlock.selectAll(".axis-group")
    .data(dataAttributes).enter().append("g")
        .attr("class", "axis-group")
        .attr("transform", d => `translate(${xParallel(d)}, 0)`);

    // renders main graph lines and styling
    axis.each(function (d) {
    d3.select(this).call(d3.axisLeft(yParallel.get(d)))
        .selectAll("text")
        .style("font-weight", "bold");

    d3.select(this).select("path").style("stroke-width", "2px");
    d3.select(this).selectAll("line").style("stroke-width", "2px");
    });

    // graph category labels
    axis.append("text")
        .attr("y", marginTop - 10)
        .attr("x", 0)
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .text(d => d);

    const categories = ["worsen", "no effect", "improve"];
    
    // format legend postion
    const legend = svg.append("g")
        .attr("transform", `translate(${width + 100}, ${height + 40})`);
    
    // legend 
    const legendPosition = legend.selectAll(".legend-item")
    .data(categories).enter().append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(${i * 180})`);

    // legend Styling
    legendPosition.append("text")
        .attr("y", 0)
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .attr("stroke", "black")
        .attr("stroke-width", 0.5)
        .attr("fill", d => colorRange(d))
        .text(d => d);

    // Chart Title
    svg.append("text")
        .attr("x", width + 132 + width * .5)
        .attr("y", marginTop - 5)
        .attr("text-anchor", "middle")
        .attr("font-size", "17px")
        .attr("font-weight", "bold")
        .text("Effect of Music Listening on Mental Wellness");        

  
    // Bar Chart //

    // Find the most listened too genres by filtering by highest engagement
    const genreCount = genres.map(g => {
        const count = filteredData.filter(d => d[g] === "Very frequently").length;
        const genre = g.replace("Frequency [", "").replace("]", "");
        return { genre, count };
      });

    // Sort the top 5 genres in order
    genreCount.sort((a, b) => d3.descending(a.count, b.count));
    const topGenres = genreCount.slice(0, 5);
  
    // set x
    const barX = d3.scaleBand()
      .domain(topGenres.map(d => d.genre))
      .range([0, width])
      .padding(0.5);
  
    // set y
    const barY = d3.scaleLinear()
      .domain([0, d3.max(topGenres, d => d.count)])
      .range([height, 0]);
    
    // position graph
    const barSvg = svg.append("g")
    .attr("transform", `translate(${width + 640}, ${marginTop})`);
  
    // x-axis lines
    barSvg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(barX))
      .selectAll("text")
      .attr("font-size", "12px")
      .style("font-weight", "bold")

    // y-axis lines
    barSvg.append("g")
      .call(d3.axisLeft(barY))
      .attr("font-size", "12px")
      .style("font-weight", "bold");

     // chart title
    barSvg.append("text")
      .attr("x", width * .5)
      .attr("y", -11)
      .attr("text-anchor", "middle")
      .attr("font-size", "17px")
      .text("Top 5 Most Frequently Listened to Genres")
      .style("font-weight", "bold");

    // x-axis title
    barSvg.append("text")
      .attr("x", width * .5)
      .attr("y", height + 40)
      .attr("text-anchor", "middle")
      .text("Genre")
      .style("font-weight", "bold");

  
    // y-axis title
    barSvg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", height * -.5)
      .attr("y", -50)
      .attr("text-anchor", "middle")
      .text("Number of Respondents")
      .style("font-weight", "bold");

  
    // render data 
    barSvg.selectAll("rect")
      .data(topGenres).enter().append("rect")
      .attr("x", d => barX(d.genre))
      .attr("y", d => barY(d.count))
      .attr("width", barX.bandwidth())
      .attr("height", d => height - barY(d.count))
      .attr("fill", "lightblue");

    });