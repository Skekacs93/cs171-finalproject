/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 1/28/15.
 */



/*
 *
 * ======================================================
 * We follow the vis template of init - wrangle - update
 * ======================================================
 *
 * */

/**
 * AgeVis object for HW3 of CS171
 * @param _parentElement -- the HTML or SVG element (D3 node) to which to attach the vis
 * @param _data -- the data array
 * @param _metaData -- the meta-data / data description object
 * @constructor
 */
GraphVis = function(_parentElement, _data, _metaData, _eventHandler){
    this.parentElement = _parentElement;
    this.data = _data;
    this.metaData = _metaData;
    this.eventHandler = _eventHandler;
    this.displayData = [];

    var that = this;

    // TODO: define all "constants" here
    this.width = getInnerWidth(this.parentElement);
    this.height = 190;
    
    this.topheight = 10; //start of the top of the graph
    this.innerheight = 160; //height of the graph
    this.innerwidthstart = 30; //how far in the graph starts
    this.outerwidth = this.width - 10;

    // TODO: implement update graphs (D3: update, enter, exit)
    this.x = d3.time.scale().range([this.innerwidthstart, this.outerwidth]),
    this.x2 = d3.time.scale().rangeRound([this.innerwidthstart, this.outerwidth]),
    this.y = d3.scale.linear().range([this.innerheight, this.topheight ]);

    this.xAxis = d3.svg.axis()
      .scale(this.x2)
      .orient("bottom");

    this.yAxis = d3.svg.axis()
      .scale(this.y)
      .orient("left");

    this.initVis();

}


/**
 * Method that sets up the SVG and the variables
 */
GraphVis.prototype.initVis = function(){

    var that = this; // read about the this

    //TODO: implement here all things that don't change
    //TODO: implement here all things that need an initial status
    // Examples are:
    // - construct SVG layout
    // - create axis
    // -  implement brushing !!
    // --- ONLY FOR BONUS ---  implement zooming

    // TODO: modify this to append an svg element, not modify the current placeholder SVG element
    this.svg = this.parentElement.append("svg")
                .attr("height", this.height)
                .attr("width", this.width)

    // Add axes visual elements
    this.svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + this.innerheight + ")")

    this.svg.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + this.innerwidthstart + ",0)")


    // filter, aggregate, modify data
    this.wrangleData(null);

    // call the update method
    this.updateVis();
}

GraphVis.prototype.wrangleData= function(_filterFunction){

    // displayData should hold the data which is visualized
    this.displayData = this.filterAndAggregate(_filterFunction);


}


/**
 * the drawing function - should use the D3 selection, enter, exit
 */
GraphVis.prototype.updateVis = function(){

    var that = this;

    // add the tooltip area to the webpage
    var tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    time_aggregated = this.displayData['time_aggregated']

    this.x2.domain(d3.extent(time_aggregated, function(d) { return d.key; }));
    this.x.domain([0, time_aggregated.length - 1])
    this.y.domain(d3.extent(time_aggregated, function(d) { return d.values; }));

    // updates axis
    this.svg.select(".x.axis")
        .call(this.xAxis);

    this.svg.select(".y.axis")
        .call(this.yAxis)

    
    this.svg.selectAll(".dot").remove()    

    this.svg.selectAll(".dot")
      .data(time_aggregated)
    .enter().append("circle")
      .attr("class", "dot")
      .attr("r", 3.5)
      .attr("cx", function(d) { return that.x2(d.key) })
      .attr("cy", function(d) { return that.y(d.values) })
      .style("fill", 'green')
      .style("cursor", "pointer")
      .on("mouseover", function(d) {
          tooltip.transition()
               .duration(200)
               .style("opacity", 1);
          tooltip.html((d.key.getMonth() + 1) + "-" + d.key.getDate() + "-" + d.key.getFullYear() + '<br>' + d.values.toString() + ' trips')
               .style("left", (d3.event.pageX + 5) + "px")
               .style("top", (d3.event.pageY - 28) + "px");
      })
      .on("mouseout", function(d) {
          tooltip.transition()
               .duration(500)
               .style("opacity", 0);
      })
      .on("click", function(d) {
        t = new Date(d.key.getTime() + 24*60*60*1000)
        startdate = (d.key.getMonth() + 1).toString() + '/' + d.key.getDate().toString() + '/' + d.key.getFullYear().toString()
        enddate = (t.getMonth() + 1).toString() + '/' + t.getDate().toString() + '/' + t.getFullYear().toString()
        $("#enddate").datepicker('update',enddate)
        $("#startdate").datepicker('update',startdate)
        $("#changed").change()
      }); 
}


/**
 * Gets called by event handler and should create new aggregated data
 * aggregation is done by the function "aggregate(filter)". Filter has to
 * be defined here.
 * @param selection
 */
GraphVis.prototype.onSelectionChange= function (){

    this.wrangleData(null);

    this.updateVis();

}

GraphVis.prototype.filterAndAggregate = function(_filter){
    // Set filter to a function that accepts all items
    // ONLY if the parameter _filter is NOT null use this parameter
    var filter = function(){return true;}
    if (_filter != null){
        filter = _filter;
    }
    //Dear JS hipster, a more hip variant of this construct would be:
    // var filter = _filter || function(){return true;}

    // define date filters
    var date_start = document.getElementsByName("start")[0].value
    if (date_start == ''){
        date_start = '01/01/2014'
        $("#startdate").val('01/01/2014')
    }
    date_start = new Date(date_start.slice(6) + '-' + date_start.slice(0, 2) + '-' + date_start.slice(3, 5))
    date_start = new Date(date_start.getTime() + 1000*60*60*6);

    var date_end = document.getElementsByName("end")[0].value
    if (date_end == ''){
        date_end = '04/01/2015'
        $("#enddate").val('04/01/2015')
    }
    date_end = new Date(date_end.slice(6) + '-' + date_end.slice(0, 2) + '-' + date_end.slice(3, 5))
    date_end = new Date(date_end.getTime() + 1000*60*60*6);
    
    // define party filter
    var party_filter = document.getElementById("filter-party").value
    party_filter = party_filter.replace("Republican", "R").replace("Democrat", "D")
    // define ethnicity filter
    var ethnicity_filter = document.getElementById("filter-ethnicity").value

    // define religion filter
    var religion_filter = document.getElementById("filter-religion").value

    var person_filter = document.getElementById("filter-member").value

    var sponsor_filter = document.getElementById("filter-sponsor").value

    var committee_filter = document.getElementById("filter-committee").value

    var country_filter = document.getElementById("filter-country").value
    var state_filter = document.getElementById("filter-state").options[document.getElementById("filter-state").selectedIndex].text
    if(state_filter != '') {
        $("#filter-country").val('United States').trigger('chosen:updated')
    }

    var that = this;
    data = that.data;

    filtered_data = []

    sponsors_dict = {}
    for (var i = 0; i < this.metaData['sponsors'].length; i++) {
        sponsors_dict[this.metaData['sponsors'][i]] = 0
    };

    data.forEach(function(d, i){
      var departure_date = new Date(d.departure_date)
      if (departure_date > date_start && departure_date < date_end){
        if (d.party == party_filter || party_filter == ''){
          if (d.ethnicity == ethnicity_filter || ethnicity_filter == ''){
            if (d.person == person_filter || person_filter == ''){
              if (d.destination_country == country_filter || country_filter == ''){
                if (d.destination_state == state_filter || state_filter == ''){
                  if (d.religion == religion_filter || religion_filter == ''){ 
                    var committees = d.committees.replace('["', '').replace('"]', '').split('", "')
                    if (committees.indexOf(committee_filter) > -1 || committee_filter == ''){
                      var sponsors = d.sponsor.replace('["', '').replace('"]', '').split('", "')
                      if (sponsors.indexOf(sponsor_filter) > -1 || sponsor_filter == ''){
                        filtered_data.push(d)
                        for (var i = 0; i < sponsors.length; i++) {
                            sponsors_dict[sponsors[i]] += 1;
                        };
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    alldata = {'alldata': filtered_data}

    var time_aggregated = d3.nest()
        .key(function(d) {return d.departure_date })
        .rollup(function(d) {
            return d3.sum(d, function(g) {return 1; });
        }).entries(filtered_data);
    time_aggregated.sort(function(a,b) { return b.key - a.key })

    for (var i = 0; i < time_aggregated.length; i++) {
        time_aggregated[i].key = new Date(time_aggregated[i].key)
    };

    alldata['time_aggregated'] = time_aggregated

    var party_aggregated = d3.nest()
        .key(function(d) {return d.party })
        .rollup(function(d) {
            return d3.sum(d, function(g) {return 1; });
        }).entries(filtered_data);
    party_aggregated.sort(function(a,b) { return b.values - a.values })

    alldata['party_aggregated'] = party_aggregated

    return alldata
}



