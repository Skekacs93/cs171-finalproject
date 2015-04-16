/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 1/28/15.
 */


//TODO: DO IT ! :) Look at agevis.js for a useful structure

MapVis = function(_parentElement, _data, _metaData, _eventHandler){
    this.parentElement = _parentElement;
    this.data = _data;
    this.metaData = _metaData;
    this.eventHandler = _eventHandler;
    this.displayData = [];
    this.viztype = document.getElementById("viztype").value;

    // define all constants here
    this.margin = {top: 10, right: 10, bottom: 10, left: 10},
    this.width = getInnerWidth(this.parentElement) - this.margin.left - this.margin.right;
    this.height = 500 - this.margin.top - this.margin.bottom;

    this.initVis();
}

/**
 * Method that sets up the SVG and the variables
 */
MapVis.prototype.initVis = function(){

    var that = this; // read about the this

    this.color = d3.scale.category20();

    this.xAxis = d3.svg.axis()
      .scale(this.x)
      .orient("bottom");

    this.yAxis = d3.svg.axis()
      .scale(this.y)
      .ticks(6)
      .orient("left");

    // filter, aggregate, modify data
    this.wrangleData(null);

    // call the update method
    this.updateVis();
}

/**
 * Method to wrangle the data. In this case it takes an options object
 * @param _filterFunction - a function that filters data or "null" if none
 */
MapVis.prototype.wrangleData= function(_filterFunction){

    // displayData should hold the data which is visualized
    this.displayData = this.filterAndAggregate(_filterFunction);
    //// you might be able to pass some options,
    //// if you don't pass options -- set the default options
    //// the default is: var options = {filter: function(){return true;} }
    //var options = _options || {filter: function(){return true;}};
}

/**
 * the drawing function - should use the D3 selection, enter, exit
 */
MapVis.prototype.updateVis = function(){
    // Dear JS hipster,
    // you might be able to pass some options as parameter _option
    // But it's not needed to solve the task.
    // var options = _options || {};
    var that = this;
    this.viztype = document.getElementById("viztype").value;
    if(this.viztype == "arcs") {
        arcs = this.displayData
    }
    else {
        dots = this.displayData;
    }

        var map = new Datamap({
            scope: 'world',
            element: document.getElementById('mapVis'),
            projection: 'equirectangular',
            fills: {
              defaultFill: "#ABDDA4",
              bub: 'blue',
            },
            projectionConfig: {
              rotation: [97,-30]
            },
            geographyConfig: {
                popupOnHover: false,
                highlightOnHover: false,
            },
            data: {
              'USA': {fillKey: 'lt50' },
              'MEX': {fillKey: 'lt25' },
              'CAN': {fillKey: 'gt50' },     
              'GTM': {fillKey: 'gt500'},
              'HND': {fillKey: 'eq50' },
              'BLZ': {fillKey: 'pink' },
              'GRL': {fillKey: 'eq0' },
              'CAN': {fillKey: 'gt50' }       
            }
        });

        map.graticule();
        if(this.viztype == "arcs") {
            map.arc(arcs, {
                greatArc: true,
                animationSpeed: 2000
            });
        }
        else {
            console.log(dots)
            map.bubbles(dots, {popupTemplate: function(geo, data) {
                return '<div class="hoverinfo"><strong>' + data.person + '</strong><br>' + data.startdate + ' to ' + data.enddate + '</div>'
            }})
        }

}

/**
 * Gets called by event handler and should create new aggregated data
 * aggregation is done by the function "aggregate(filter)". Filter has to
 * be defined here.
 * @param selection
 */
MapVis.prototype.onSelectionChange= function (){
    // TODO: call wrangle function
    node = document.getElementById("mapVis")
    while (node.hasChildNodes()) {
        node.removeChild(node.lastChild);
    }
    this.wrangleData(null);
    this.updateVis();
}

/**
 * The aggregate function that creates the counts for each age for a given filter.
 * @param _filter - A filter can be, e.g.,  a function that is only true for data of a given time range
 * @returns {Array|*}
 */
MapVis.prototype.filterAndAggregate = function(_filter){
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
    var date_end = document.getElementsByName("end")[0].value
    if (date_end == ''){
        date_end = '04/01/2015'
        $("#enddate").val('04/01/2015')
    }
    date_end = new Date(date_end.slice(6) + '-' + date_end.slice(0, 2) + '-' + date_end.slice(3, 5))
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
    var state_filter = document.getElementById("filter-state").value

    var viztype = document.getElementById("viztype").value;

    //coloring
    var color_by = document.getElementById("color-by").value
    color_map = {'party': {'R': 'red', 'D': 'blue'}}
    ethmap = d3.scale.category20().domain(this.metaData["ethnicities"])
    relmap = d3.scale.category20c().domain(this.metaData["religions"])

    arcs = [{
            origin: {
                latitude: 61,
                longitude: -149
            },
            destination: {
                latitude: -22,
                longitude: -43
            }
            }]
    var that = this;
    data = that.data;
    console.log("FILTERING DATA")
    if(viztype == "arcs") {
        var arcs = []
    }
    else {
        var dots = []
    }

    data.forEach(function(d, i){

      var departure_date = new Date(d.departure_date)
      if (departure_date > date_start && departure_date < date_end){
        if (d.party == party_filter || party_filter == ''){
          if (d.ethnicity == ethnicity_filter || ethnicity_filter == ''){
            if (d.person == person_filter || person_filter == ''){
              if (d.destination_country == country_filter || country_filter == ''){
                if (d.state == state_filter || state_filter == ''){
                  if (d.religion == religion_filter || religion_filter == ''){ 
                    var committees = d.committees.replace('["', '').replace('"]', '').split('", "')
                    if (committees.indexOf(committee_filter) > -1 || committee_filter == ''){
                      var sponsors = d.sponsor.replace('["', '').replace('"]', '').split('", "')
                      if (sponsors.indexOf(sponsor_filter) > -1 || sponsor_filter == ''){
                        if(color_by == 'none') {
                            color = '#9467bd'
                        }
                        else if(color_by == "party") {
                            color = color_map[color_by][d[color_by]]
                        }
                        else if(color_by == "ethnicity") {
                            color = ethmap(d.ethnicity)
                        }
                        else if(color_by == "religion") {
                            color = relmap(d.ethnicity)
                        }
                        if(document.getElementById("viztype").value == "arcs") {
                            thistrip = {origin:{latitude: d.departure_latitude, longitude: d.departure_longitude}, destination:{latitude: d.destination_latitude, longitude: d.destination_longitude}, options: {strokeColor: color}}
                            arcs.push(thistrip)  
                        }
                        else {
                            dot = {radius: 10, fillKey: 'bub', person: d.person, sponsor: sponsors, destination: d.destination, ethnicity: d.ethnicity, startdate: d.departure_date, enddate: d.return_date, religion: d.religion, committees: committees, latitude: d.destination_latitude, longitude: d.destination_longitude}
                            dots.push(dot)
                        }
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
    console.log(arcs.length)
    // create an array of values for age 0-100
    var res = d3.range(16).map(function () {
        return [0, 0, 0];
    });
    if(viztype == "arcs") {
        return arcs;
    }
    else {
        return dots;
    }
}






















