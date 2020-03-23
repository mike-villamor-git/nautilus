/**
 * ************************************
 *
 * @module  DependsOnView.tsx
 * @author
 * @date 3/11/20
 * @description Display area for services containers in Depends_On view : force-graph
 *
 * ************************************
 */
import React, { useEffect } from 'react';
import * as d3 from 'd3';
import { colorSchemeHash } from '../helpers/colorSchemeHash';

// IMPORT COMPONENTS
import Nodes from './Nodes';
import Links from './Links';

// IMPORT STYLES
import {
  Services,
  Link,
  SGraph,
  SNode,
  SetSelectedContainer,
  Options,
  NodesObject,
  TreeMap,
  NodeChild,
  View,
} from '../App.d';

type Props = {
  services: Services;
  setSelectedContainer: SetSelectedContainer;
  options: Options;
  view: View;
};

const DependsOnView: React.FC<Props> = ({
  services,
  setSelectedContainer,
  options,
  view,
}) => {
  let links: Link[] = [];
  const nodesObject: NodesObject = Object.keys(services).reduce(
    (acc: NodesObject, sName: string, i) => {
      const ports: string[] = [];
      const volumes: string[] = [];
      if (services[sName].hasOwnProperty('ports')) {
        services[sName].ports.forEach(port => {
          ports.push(port);
        });
      }
      if (services[sName].hasOwnProperty('volumes')) {
        services[sName].volumes.forEach(vol => {
          volumes.push(vol);
        });
      }
      if (services[sName].hasOwnProperty('depends_on')) {
        services[sName].depends_on.forEach(el => {
          links.push({ source: el, target: sName });
        });
      }
      const node = {
        id: i,
        name: sName,
        ports,
        volumes,
        children: {},
        row: 0,
        rowLength: 0,
        column: 0,
      };
      acc[sName] = node;
      return acc;
    },
    {},
  );

  //roots object creation, needs to be a deep copy or else deletion of non-roots will remove from nodesObject
  const roots = JSON.parse(JSON.stringify(nodesObject));
  //iterate through links and find if the roots object contains any of the link targets
  links.forEach((link: Link) => {
    if (roots[link.target]) {
      //filter the roots
      delete roots[link.target];
    }
  });

  //create Tree
  const createTree = (node: NodeChild) => {
    Object.keys(node).forEach((root: string) => {
      links.forEach((link: Link) => {
        if (link.source === root) {
          node[root].children[link.target] = nodesObject[link.target];
        }
      });
      createTree(node[root].children);
    });
  };
  createTree(roots);

  //traverse tree and create object outlining the rows/columns in each tree
  const treeMap: TreeMap = {};
  const createTreeMap = (node: NodeChild, height: number = 0) => {
    if (!treeMap[height] && Object.keys(node).length > 0) treeMap[height] = [];
    Object.keys(node).forEach((sName: string) => {
      treeMap[height].push(sName);
      createTreeMap(node[sName].children, height + 1);
    });
  };
  createTreeMap(roots);

  // populate nodesObject with column, row, and rowLength
  const storePositionLocation = (treeHierarchy: TreeMap) => {
    Object.keys(treeHierarchy).forEach((row: string) => {
      treeHierarchy[row].forEach((sName: string, column: number) => {
        nodesObject[sName].row = Number(row);
        if (!nodesObject[sName].column) nodesObject[sName].column = column + 1;
        nodesObject[sName].rowLength = treeHierarchy[row].length;
      });
    });
  };
  storePositionLocation(treeMap);
  /**
   *********************
   * Variables for d3 visualizer
   *********************
   */
  const treeDepth = Object.keys(treeMap).length;
  const nodes = Object.values(nodesObject);
  const serviceGraph: SGraph = {
    nodes,
    links,
  };

  console.log('dependson first', JSON.stringify(serviceGraph.links));

  const simulation = d3.forceSimulation<SNode>(serviceGraph.nodes).force(
    'link',
    d3
      .forceLink<SNode, Link>(serviceGraph.links)
      .distance(130)
      .id((node: SNode) => node.name),
  );

  console.log('dependson', JSON.stringify(serviceGraph.links));

  /**
   *********************
   * Depends On View
   *********************
   */
  useEffect(() => {
    const container = d3.select('.depends-wrapper');
    // const width = parseInt(container.style('width'), 10);
    // const height = parseInt(container.style('height'), 10);
    const topMargin = 20;
    const sideMargin = 20;
    const radius = 60; // Used to determine the size of each container for border enforcement

    const nodes = d3.select('.nodes').selectAll('g');
    const linkLines = d3.select('.links').selectAll('line');

    //set location when ticked
    function ticked() {
      const w = parseInt(container.style('width'));
      const h = parseInt(container.style('height'));
      // Enforces borders
      nodes
        .attr('cx', (d: any) => {
          return (d.x = Math.max(
            sideMargin,
            Math.min(w - sideMargin - radius, d.x as number),
          ));
        })
        .attr('cy', (d: any) => {
          return (d.y = Math.max(
            15 + topMargin,
            Math.min(h - topMargin - radius, d.y as number),
          ));
        })
        .attr('transform', (d: any) => {
          return 'translate(' + d.x + ',' + d.y + ')';
        });

      linkLines
        .attr('x1', (d: any) => d.source.x + 30)
        .attr('y1', (d: any) => d.source.y + 30)
        .attr('x2', (d: any) => d.target.x + 30)
        .attr('y2', (d: any) => d.target.y + 30);

      // simulation.force('center', d3.forceCenter<SNode>(w / 2, h / 2));
    }

    simulation
      .nodes(serviceGraph.nodes)
      .force('charge', d3.forceManyBody<SNode>().strength(-400))
      .on('tick', ticked);

    // move force graph with resizing window
    window.addEventListener('resize', ticked);
  }, [view, services]);

  /**
   *********************
   * PORTS OPTION TOGGLE
   *********************
   */
  useEffect(() => {
    // PORTS LOCATION
    const cx = 58;
    const cy = 18;
    const radius = 5;
    const dx = cx + radius;
    const dy = cy + radius;
    // PORTS VARIABLES
    let nodesWithPorts: d3.Selection<SVGGElement, SNode, any, any>;
    const ports: d3.Selection<SVGCircleElement, SNode, any, any>[] = [];
    const portText: d3.Selection<SVGTextElement, SNode, any, any>[] = [];
    if (options.ports) {
      // select all nodes with ports
      nodesWithPorts = d3
        .select('.nodes')
        .selectAll<SVGGElement, SNode>('g')
        .filter((d: SNode) => d.ports.length > 0);

      // iterate through all nodes with ports
      nodesWithPorts.each(function(d: SNode) {
        const node = this;
        // iterate through all ports of node
        d.ports.forEach((pString, i) => {
          // add svg port
          const port = d3
            .select<SVGElement, SNode>(node)
            .append('circle')
            .attr('class', 'port')
            .attr('cx', cx)
            .attr('cy', cy + i * 12)
            .attr('r', radius);
          // store d3 object in ports array
          ports.push(port);
          // add svg port text
          const pText = d3
            .select<SVGElement, SNode>(node)
            .append('text')
            .text(pString)
            .attr('class', 'ports-text')
            .attr('color', 'white')
            .attr('dx', dx)
            .attr('dy', dy + i * 12);
          // store d3 object in ports text array
          portText.push(pText);
        });
      });
    }

    return () => {
      // before unmoutning, if ports option was on, remove the ports
      if (options.ports) {
        ports.forEach(node => node.remove());
        portText.forEach(node => node.remove());
      }
    };
    // only fire when options.ports changes
  }, [options.ports]);

  /**
   *********************
   * VOLUMES OPTION TOGGLE
   *********************
   */
  useEffect(() => {
    // VOLUMES LOCATION
    const x = 8;
    const y = 20;
    const width = 10;
    const height = 10;
    // VOLUMES VARIABLES
    let nodesWithVolumes: d3.Selection<SVGGElement, SNode, any, any>;
    const volumes: d3.Selection<SVGRectElement, SNode, any, any>[] = [];
    const volumeText: d3.Selection<SVGTextElement, SNode, any, any>[] = [];
    if (options.volumes) {
      // select all nodes with volumes
      nodesWithVolumes = d3
        .select('.nodes')
        .selectAll<SVGGElement, SNode>('g')
        .filter((d: SNode) => d.volumes.length > 0);

      // iterate through all nodes with volumes
      nodesWithVolumes.each(function(d: SNode) {
        const node = this;
        // iterate through all volumes of node
        d.volumes.forEach((vString, i) => {
          let onClick = false;
          let onceClicked = false;
          // add svg volume
          const volume = d3
            .select<SVGElement, SNode>(node)
            .append('rect')
            .attr('class', 'volumeSVG')
            .attr('fill', () => {
              let slicedVString = colorSchemeHash(
                vString.slice(0, vString.indexOf(':')),
              );
              return slicedVString;
            })
            .attr('width', width)
            .attr('height', height)
            .attr('x', x)
            .attr('y', y + i * 12)
            .on('mouseover', () => {
              return vText.style('visibility', 'visible');
            })
            .on('mouseout', () => {
              !onClick
                ? vText.style('visibility', 'hidden')
                : vText.style('visibility', 'visible');
            })
            .on('click', () => {
              onceClicked = !onceClicked;
              onClick = onceClicked;
            });
          // store d3 object in volumes array
          volumes.push(volume);
          // add svg volume text
          const vText = d3
            .select<SVGElement, SNode>(node)
            .append('text')
            .text(vString)
            .attr('class', 'volume-text')
            .attr('fill', 'black')
            .attr('text-anchor', 'end')
            .attr('dx', x - 5)
            .attr('dy', y + (i + 1) * 11)
            .style('visibility', 'hidden');
          // store d3 object in volumes text array
          volumeText.push(vText);
        });
      });
    }

    return () => {
      // before unmounting, if volumes option was on, remove the volumes
      if (options.volumes) {
        volumes.forEach(node => node.remove());
        volumeText.forEach(node => node.remove());
      }
    };
    // only fire when options.volumes changes
  }, [options.volumes]);

  /**
   *********************
   * DEPENDS ON OPTION TOGGLE
   *********************
   */
  useEffect(() => {
    if (options.dependsOn) {
      d3.select('.arrowsGroup').classed('hide', false);
      d3.select('.links').classed('hide', false);
    } else {
      d3.select('.arrowsGroup').classed('hide', true);
      d3.select('.links').classed('hide', true);
    }
  }, [options.dependsOn]);

  return (
    <>
      <div className="depends-wrapper">
        <svg className="graph">
          <Nodes
            simulation={simulation}
            treeDepth={treeDepth}
            nodes={serviceGraph.nodes}
            setSelectedContainer={setSelectedContainer}
            services={services}
          />
          <Links links={serviceGraph.links} services={services} />
        </svg>
      </div>
    </>
  );
};

export default DependsOnView;
