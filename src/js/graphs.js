var linksGraph = null;
var tagsGraph = null;



////////////////////////////////////////// LINKS GRAPH
var filterLinksNodes = function(term) {
  g = linksGraph.graph;

  if(term) {
    var rgx = new RegExp(term,"gi");
    g.nodes().forEach(function(n) {
      upsetLinkNode(n,rgx.test(n.savedLabel),true);
    });
    g.edges().forEach(function(e) {
      e.color = "rgba(0,0,0,0)";
    });
  } else {
    resetLinkNodes();   
  }

  linksGraph.refresh();
};
var upsetLinkNode = function(n,flag,searchresults) {
  if(flag) {
    n.color = searchresults ? "#8D7C0D" : n.originalColor;
    n.label = n.savedLabel;
  } else {
    n.color = searchresults ? "#C5C5C5" : "rgba(0,0,0,0)";
    delete n.label;
  }
};
var resetLinkNodes = function() {
  linksGraph.graph.nodes().forEach(function(n) {
    n.color = n.originalColor;
    n.label = n.savedLabel;
  });
  linksGraph.graph.edges().forEach(function(e) {
    e.color = "#EEEEEE";
  });
};

var loadLinksGraph = function(scope) {

  scope.state.graphstatus = "LOADING";
  
  try {
    sigma.classes.graph.addMethod('neighbors', function(nodeId) {
      var k,
          neighbors = {},
          //nedges = [];
          index = this.allNeighborsIndex[nodeId] || {};
      for (k in index) {
        neighbors[k] = this.nodesIndex[k];
        //nedges.push(this.allNeighborsIndex[nodeId][k]);
      }
      //console.log("edges",nedges);
      return neighbors;
    });
  } catch(err) {}


  var g = sigma.parsers.gexf(
    scope.settings.datapath + "links_"+scope.state.lang+".gexf",
    {
      container: 'sigma-links',
      renderer: {
        container: document.getElementById('sigma-links'),
        type: 'canvas'
      },
      settings: {
        labelThreshold: 5,
        //defaultLabelColor: "rgb(200,200,200)",
        zoomingRatio: 1.5,
        doubleClickZoomingRatio: 1.7,
        defaultLabelSize: 12,
        hideEdgesOnMove: true,
        drawEdges: true,
        doubleClickEnabled: false,
        //labelColor: "node",
      }
    },
    function(s) {
      
      linksGraph = s;

      // init things on the graph
      s.graph.nodes().forEach(function(n) {
        n.color = "#9C9C9C";
        n.originalColor = "#9C9C9C";
        n.savedLabel = n.label;
        //delete n.label;
      });
      s.graph.edges().forEach(function(e) {
        e.color = "#EEEEEE";
      });

      // doubleclick to open link
      s.bind('doubleClickNode', function(event) {
        console.log("doubleclicked node:",event.data.node);
        var url = event.data.node.url || "http://manifest.es";
        var win = window.open(url, '_blank');
        win.focus();
      });
      
      // simple click shows neighbors
      s.bind('clickNode', function(event) {
        if(!event.data.captor.isDragging) {
          var nodeId = event.data.node.id,
              toKeep = s.graph.neighbors(nodeId);
          toKeep[nodeId] = event.data.node;

          console.log(event.data.node);

          s.graph.nodes().forEach(function(n) {
            upsetLinkNode(n,toKeep[n.id]);
          });
          event.data.node.color = "#883E3E";

          s.graph.edges().forEach(function(e) {
            if (toKeep[e.source] && toKeep[e.target]) 
              e.color = "#EEEEEE";
            else {
              e.color = "rgba(0,0,0,0)";
            }
          });
          s.refresh();
        }
      });

      s.bind('clickStage', function(event) {
        if(!event.data.captor.isDragging) {
          resetLinkNodes();
          s.refresh();
        }
      });

      console.log("links graph loaded");

      s.refresh();

      scope.state.graphstatus = "OK";

      scope.$apply();
    });
}






////////////////////////////////////////// TAG GRAPH
var updateTagNodes = function(tags) {
  g = tagsGraph.graph;

  g.nodes().forEach(function(n) {
    //console.log(n);
    if(tags.length) {
      upsetTagNode(n, tags.indexOf(n.tag)!=-1);
    } else {
      upsetTagNode(n, true, true);
    }
  });

  tagsGraph.refresh();
};
var upsetTagNode = function(n,flag,reset) {
  if(reset) {
    n.color = n.originalColor;
  } else if(flag) {
    n.color = "rgb(130,20,20)";
  } else {
    n.color = '#A7A7A7';
  }
};

var loadTagGraph = function(scope) {
  var g = sigma.parsers.gexf(
    scope.settings.datapath + "tags.gexf",
    {
      container: 'sigma-tags',
      renderer: {
        container: document.getElementById('sigma-tags'),
        type: 'canvas'
      },
      settings: {
        labelThreshold: 0,
        //defaultLabelColor: "rgb(200,200,200)",
        zoomingRatio: 1.4,
        doubleClickZoomingRatio: 1.7,
        defaultLabelSize: 10,
        //arrowSizeRatio: 50,
      }
    },
    function(s) {

      tagsGraph = s;

      s.bind('clickNode', function(event) {
        if(!event.data.captor.isDragging) {
          console.log("clickedTag:",event.data.node);
          scope.toggleTag(event.data.node.tag,true);
          scope.tagDescription(event.data.node.tag);
        }
      });
      s.bind('clickStage', function(event) {
        if(!event.data.captor.isDragging) {
          scope.toggleTag(null,true);
          scope.tagDescription();
        }
      });
      s.bind('overNode', function(event) {
        scope.tagDescription(event.data.node.tag);
      });
      s.bind('outNode', function(event) {
        scope.tagDescription();
      });

      var ids = {} ;
      var orphans = [];

      // init things on the graph
      s.graph.nodes().forEach(function(n) {
        n.originalColor = n.color;
      });

      // update sizes and labels
      _.each(s.graph.nodes(), function(n) {
        //console.log(n);
        var t = n.label;
        
        ids[t] = n.id;
        n.tag = t;
        n.label = scope.tagsContents[t].label;

        if(scope.meta.tags[t] && scope.linksByTag[t]) {
          n.size = 18 + scope.linksByTag[t].length;
        } else {
          orphans.push(t);
          n.size = 1;
          //n.label = t;
        }
      });

      console.log("!! graph nodes unused:",orphans);

      _.each(s.graph.edges(), function(e) {
        //console.log(e);
        //s.graph.dropEdge(e.id);
        //e.label = "noix";
        //e.size = 20;
        //e.weight = 20;
        e.color = "rgb(200,200,210)";
        e.type = 'curve'; //['line', 'curve', 'arrow', 'curvedArrow'][Math.random() * 4 | 0];
        //console.log(e);
      });


      // _.each(scope.templinks4graph, function(l,i) {
      //   s.graph.addEdge({
      //     id: "new_"+i,
      //     source: ids[l[0]],
      //     target: ids[l[1]],
      //     color: "rgb(200,50,50)"
      //   });
      // });

      s.refresh();

      console.log("tag graph made",s.graph);
    }
  );
}