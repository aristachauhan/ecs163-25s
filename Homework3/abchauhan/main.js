// initialize div container for select dropdown
const Div = d3
  .select("body")
  .append("div")
  .attr("id", "dropdown-container")
  .style("position", "absolute")
  .style("left", "1000px")
  .style("top", "450px");

Div.append("select").attr("id", "scatterSelect");

// render and set option text
const selectOption = [3, 5, 8];
d3.select("#scatterSelect")
  .selectAll("option")
  .data(selectOption)
  .enter()
  .append("option")
  .text((d) => `Top ${d} Genres`)
  .style("font-size", "15px")
  .attr("value", (d) => d);

// data processing
d3.csv("mxmh_survey_results.csv").then((regularData) => {
  regularData.forEach((d) => {
    d["Primary streaming service"] =
      {
        "YouTube Music": "YouTube",
        "I do not use a streaming service.": "None",
        "Other streaming service": "Other",
      }[(d["Primary streaming service"] || "").trim()] ||
      (d["Primary streaming service"] || "").trim();

    d["Music effects"] = (d["Music effects"] || "").trim().toLowerCase();

    // convert csv string to number
    d["Hours per day"] = Number(d["Hours per day"]);
    d.BPM = Number(d.BPM);
    d.Age = Number(d.Age);
  });

  // filter for genre titles
  const genreColumns = regularData.columns;
  const genres = genreColumns.filter((col) => col.includes("Frequency ["));

  // chart sizing variables
  const height = 300;
  parallelHeight = 330;
  const parallelwidth = 400;
  const width = 470;
  const marginTop = 30;
  const marginBottom = 30;
  const marginLeft = 40;

  const scatterWidth = 400;
  const scatterHeight = 380;
  const scatterMarginTop = 30;
  const scatterMarginBottom = 30;
  const scatterMarginLeft = 40;
  const scatterMarginRight = 20;

  // filter out missing data and outliers
  const filteredData = regularData.filter(
    (d) =>
      d.Age !== "" &&
      d["Hours per day"] !== "" &&
      d.BPM !== "" &&
      d.BPM < 800 &&
      d["Primary streaming service"] !== "" &&
      d["Music effects"] !== ""
  );

  // declare our window size
  const svg = d3.select("svg").attr("width", 1400).attr("height", 770);

  // declare values for correct rendering and legend
  const scatterTypes = ["Anxiety", "Depression", "Insomnia", "OCD"];
  const scatterColors = {
    Anxiety: "firebrick",
    Depression: "royalblue",
    Insomnia: "slateblue",
    OCD: "forestgreen",
  };

  // legend circles
  svg
    .selectAll("scatterdots")
    .data(scatterTypes)
    .enter()
    .append("circle")
    .attr("cx", marginLeft + 500)
    .attr("cy", (d, i) => 100 + i * 25)
    .attr("r", 7)
    .style("fill", (d) => scatterColors[d]);

  // legend text
  svg
    .selectAll("scatterlabels")
    .data(scatterTypes)
    .enter()
    .append("text")
    .attr("x", marginLeft + 500 + 20)
    .attr("y", (d, i) => 100 + i * 25)
    .style("fill", (d) => scatterColors[d])
    .text((d) => d)
    .attr("font-weight", "bold")
    .style("alignment-baseline", "middle")
    .style("font-size", "15px");

  // re-format data for rendering
  const scatterData = [];
  regularData.forEach((d) => {
    const hour = d["Hours per day"];
    if (hour !== " ") {
      scatterTypes.forEach((type) => {
        const score = d[type];
        if (score !== " ") {
          scatterData.push({ type, score, hour });
        }
      });
    }
  });

  // declare scatter svg
  const scatterGroup = svg
    .append("g")
    .attr("transform", `translate(${marginLeft + 50}, ${marginTop})`);

  // x-axis
  const xScatter = d3
    .scaleLinear()
    .domain([-0.5, 10.5])
    .range([scatterMarginLeft, scatterWidth - scatterMarginRight]);

  //y -axis
  const yScatter = d3
    .scaleLinear()
    .domain([-0.5, 24.5])
    .range([scatterHeight - scatterMarginBottom, scatterMarginTop]);

  // chart postioning x-axis
  scatterGroup
    .append("g")
    .attr("transform", `translate(0, ${scatterHeight - scatterMarginBottom})`)
    .call(d3.axisBottom(xScatter));

  // chart positioning y-axis
  scatterGroup
    .append("g")
    .attr("transform", `translate(${scatterMarginLeft}, 0)`)
    .call(d3.axisLeft(yScatter));

  // x-axis labels
  scatterGroup
    .append("text")
    .attr("x", scatterWidth / 2)
    .attr("y", scatterHeight + 10)
    .attr("text-anchor", "middle")
    .style("font-size", "17px")
    .attr("fill", "black")
    .style("font-weight", "bold")
    .text("Mental Helath Score");

  // y-axis labels
  scatterGroup
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -scatterHeight / 2)
    .attr("y", scatterMarginLeft - 45)
    .attr("text-anchor", "middle")
    .attr("fill", "black")
    .style("font-size", "17px")
    .text("Hours per Day")
    .style("font-weight", "bold");

  // Scatter Plot Title
  scatterGroup
    .append("text")
    .attr("x", scatterWidth / 2)
    .attr("y", scatterMarginTop - 30)
    .attr("text-anchor", "middle")
    .attr("font-size", "19px")
    .attr("fill", "black")
    .attr("font-weight", "bold")
    .text("Impact of Music Listening on Mental Health Scale");

  // rendering dots
  const scatterDots = scatterGroup
    .selectAll(".dot")
    .data(scatterData)
    .enter()
    .append("circle")
    .attr("class", "dot")
    .attr("cx", (d) => xScatter(d.score))
    .attr("cy", (d) => yScatter(d.hour))
    .attr("r", 3)
    .attr("fill", (d) => scatterColors[d.type])
    .style("stroke", "steelblue");

  let currentType = "All";

  // brush rendering
  scatterGroup.call(
    d3
      .brush()
      .extent([
        [scatterMarginLeft, scatterMarginTop],
        [
          scatterWidth - scatterMarginRight,
          scatterHeight - scatterMarginBottom,
        ],
      ])
      .on("start brush end", ({ selection }) => {
        let selected = [];

        if (selection) {
          // render brush view
          const [[x0, y0], [x1, y1]] = selection;

          scatterDots.style("fill", "gray").style("opacity", 0.4);

          scatterDots
            .filter((d) => {
              const cx = xScatter(d.score);
              const cy = yScatter(d.hour);
              const inBrush = x0 <= cx && cx < x1 && y0 <= cy && cy < y1;
              const matchesType =
                currentType === "All" || d.type === currentType;
              return inBrush && matchesType;
            })
            .style("fill", (d) => scatterColors[d.type])
            .style("opacity", 1)
            .each((d) => selected.push(d));
        } else {
          // render normal view in color
          scatterDots
            .style("fill", (d) =>
              currentType === "All" || d.type === currentType
                ? scatterColors[d.type]
                : "gray"
            )
            .style("opacity", (d) =>
              currentType === "All" || d.type === currentType ? 1 : 0.4
            );
        }
      })
  );

  // Parallel Coordinate Graph //

  const dataAttributes = [
    "Age",
    "Hours per day",
    "BPM",
    "Primary streaming service",
  ];
  const colors = "Music effects";

  // find the count for each effect category
  const counts = {};
  filteredData.forEach((d) => {
    const effect = d[colors];
    counts[effect] = (counts[effect] || 0) + 1;
  });

  const yParallel = new Map();

  // mapping positions of lines in relation to y-axis
  yParallel.set(
    "Age",
    d3
      .scaleLinear()
      .domain(d3.extent(filteredData, (d) => d.Age))
      .range([parallelHeight - marginBottom, marginTop])
  );

  yParallel.set(
    "Hours per day",
    d3
      .scaleLinear()
      .domain(d3.extent(filteredData, (d) => d["Hours per day"]))
      .range([parallelHeight - marginBottom, marginTop])
  );

  yParallel.set(
    "BPM",
    d3
      .scaleLinear()
      .domain(d3.extent(filteredData, (d) => d.BPM))
      .range([parallelHeight - marginBottom, marginTop])
  );

  yParallel.set(
    "Primary streaming service",
    d3
      .scalePoint()
      .domain([
        ...new Set(filteredData.map((d) => d["Primary streaming service"])),
      ])
      .range([parallelHeight - marginBottom, marginTop])
  );

  // set x
  const xParallel = d3
    .scalePoint()
    .domain(dataAttributes)
    .range([0, parallelwidth]);

  // assign colors to effect
  const colorScale = d3
    .scaleOrdinal()
    .domain(["worsen", "no effect", "improve"])
    .range(["red", "orange", "deepskyblue"]);

  // makes lines
  const parallelLine = d3
    .line()
    .defined(([, value]) => value != null)
    .x(([key]) => xParallel(key))
    .y(([key, value]) => yParallel.get(key)(value));

  // graph positioning
  const parallelBlock = svg
    .append("g")
    .attr("transform", `translate(${parallelwidth + 470}, ${marginTop + 30})`);

  // line styling
  parallelBlock
    .selectAll(".parallel-line")
    .data(filteredData)
    .enter()
    .append("path")
    .attr("class", "parallel-line")
    .attr("fill", "none")
    .attr("stroke", (d) => colorScale(d[colors]))
    .attr("stroke-opacity", 0.7)
    .attr("stroke-width", 2)
    .attr("d", (d) => parallelLine(dataAttributes.map((key) => [key, d[key]])));

  // positions the axis lines
  const axis = parallelBlock
    .selectAll(".axis-group")
    .data(dataAttributes)
    .enter()
    .append("g")
    .attr("class", "axis-group")
    .attr("transform", (d) => `translate(${xParallel(d)}, 0)`);

  // renders main graph lines and styling
  axis.each(function (d) {
    d3.select(this)
      .call(d3.axisLeft(yParallel.get(d)))
      .selectAll("text")
      .attr("font-size", "13px")
      .style("font-weight", "bold");

    d3.select(this).select("path").style("stroke-width", "2px");
    d3.select(this).selectAll("line").style("stroke-width", "2px");
  });

  // graph category labels
  axis
    .append("text")
    .attr("y", marginTop - 20)
    .attr("x", 0)
    .attr("fill", "black")
    .attr("font-size", "14px")
    .attr("text-anchor", "middle")
    .style("font-weight", "bold")
    .text((d) => d);

  const keys = colorScale.domain();
  // legend character rendering
  svg
    .selectAll("dots")
    .data(keys)
    .enter()
    .append("circle")
    .attr("cx", marginLeft + 1250)
    .attr("cy", (d, i) => 100 + i * 25)
    .attr("r", 7)
    .style("fill", (d) => colorScale(d));

  //legend text
  svg
    .selectAll("labels")
    .data(keys)
    .enter()
    .append("text")
    .attr("x", marginLeft + 1250 + 20)
    .attr("y", (d, i) => 100 + i * 25)
    .style("fill", (d) => colorScale(d))
    .text((d) => d.charAt(0).toUpperCase() + d.slice(1))
    .attr("text-anchor", "left")
    .attr("font-weight", "bold")
    .style("alignment-baseline", "middle")
    .style("font-size", "14px");

  // Chart title
  parallelBlock
    .append("text")
    .attr("x", parallelwidth / 2)
    .attr("y", scatterMarginTop - 58)
    .attr("text-anchor", "middle")
    .attr("font-size", "19px")
    .attr("fill", "black")
    .attr("font-weight", "bold")
    .text("Impact of Music Listening on Mental Health Scale");

  // Bar Chart //

  const genreCount = genres.map((g) => {
    const count = filteredData.filter((d) => d[g] === "Very frequently").length;
    const genre = g.replace("Frequency [", "").replace("]", "");
    return { genre, count };
  });
  // sort bars most popular to least
  genreCount.sort((a, b) => d3.descending(a.count, b.count));

  // call to render bar chart
  const initialRender = d3.select("#scatterSelect").property("value");
  renderBarChart(initialRender);

  // re-render with user selection
  d3.select("#scatterSelect").on("change", function () {
    const selectedNum = d3.select(this).property("value");
    renderBarChart(selectedNum);
  });

  function renderBarChart(genreNum) {
    const topGenres = genreCount.slice(0, genreNum);

    // remove bars between animations
    svg.selectAll(".bar-chart-group").remove();

    // bar svg
    const barSvg = svg
      .append("g")
      .attr("class", "bar-chart-group")
      .attr("transform", `translate(${width + 50}, ${marginTop + 390})`);

    // x
    const barX = d3
      .scaleBand()
      .domain(topGenres.map((d) => d.genre))
      .range([0, width])
      .padding(0.5);

    // y
    const barY = d3
      .scaleLinear()
      .domain([0, d3.max(topGenres, (d) => d.count)])
      .range([height, 0]);
    // x-axis
    barSvg
      .append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(barX))
      .selectAll("text")
      .attr("font-size", "12px")
      .style("font-weight", "bold")
      .text((d) => (d === "Video game music" ? "VG Music" : d))
      .attr("font-size", "12px")
      .style("font-weight", "bold");
    // y-axis
    barSvg
      .append("g")
      .call(d3.axisLeft(barY))
      .attr("font-size", "12px")
      .style("font-weight", "bold");

    // Chart Title
    barSvg
      .append("text")
      .attr("x", width * 0.5)
      .attr("y", -11)
      .attr("text-anchor", "middle")
      .attr("font-size", "19px")
      .text(`Top ${genreNum} Most Frequently Listened to Genres`)
      .style("font-weight", "bold");

    // x-axis tit;e
    barSvg
      .append("text")
      .attr("x", width * 0.5)
      .attr("y", height + 40)
      .attr("text-anchor", "middle")
      .text("Genre")
      .style("font-weight", "bold");

    // y-axis title
    barSvg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", height * -0.5)
      .attr("y", -50)
      .attr("text-anchor", "middle")
      .text("Number of Respondents")
      .style("font-weight", "bold");

    // animation specs
    barSvg
      .selectAll(".genre-bar")
      .data(topGenres)
      .enter()
      .append("rect")
      .attr("class", "genre-bar")
      .attr("x", (d) => barX(d.genre))
      .attr("y", height)
      .attr("width", barX.bandwidth())
      .attr("height", 0)
      .attr("fill", "lightblue")
      .style("opacity", 0.8)
      .transition()
      .duration(900)
      .delay((d, i) => i * 200)
      .attr("y", (d) => barY(d.count))
      .attr("height", (d) => height - barY(d.count));
  }
});
