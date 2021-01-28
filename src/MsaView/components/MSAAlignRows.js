/* eslint-disable react/prop-types,react/sort-comp */
import MSAAlignCanvasFactory from "./MSAAlignCanvas";
import { isGapChar } from "./util";
const styles = {
  alignmentRows: {
    position: "relative",
    overflowX: "scroll",
    overflowY: "scroll",
    padding: "1px",
    cursor: "move",
  },
  alignmentRowsBack: {
    zIndex: 2,
  },

  alignmentColumnCursor: {
    position: "absolute",
    zIndex: "1",
    borderStyle: "solid",
    borderWidth: "1px",
    borderColor: "black",
    backgroundColor: "black",
    opacity: "0.1",
    pointerEvents: "none",
  },
};

export default function(pluginManager) {
  const { jbrequire } = pluginManager;
  const React = jbrequire("react");
  const { observer } = jbrequire("mobx-react");
  const { withStyles } = jbrequire("@material-ui/core/styles");
  const MSAAlignCanvas = jbrequire(MSAAlignCanvasFactory);

  class MSAAlignRows extends React.Component {
    constructor(props) {
      super(props);
      this.rowsDivRef = React.createRef();
      this.state = {};
    }

    componentDidUpdate() {
      this.setScrollPos();
      // this.setClientSize();
    }

    componentDidMount() {
      this.setScrollPos();
      this.setClientSize();
      window.addEventListener("resize", this.setClientSize.bind(this));
    }

    componentWillUnmount() {
      window.removeEventListener("resize", this.setClientSize.bind(this));
    }

    setClientSize() {
      this.props.setClientSize(
        this.rowsDivRef.current.clientWidth,
        this.rowsDivRef.current.clientHeight,
      );
      this.setState({
        clientWidth: this.rowsDivRef.current.clientWidth,
        clientHeight: this.rowsDivRef.current.clientHeight,
      });
    }

    setScrollPos(opts) {
      opts = opts || this.props;
      this.rowsDivRef.current.scrollLeft = opts.scrollLeft;
      this.rowsDivRef.current.scrollTop = opts.scrollTop;
    }

    handleClick(evt) {
      this.props.handleAlignCharClick(this.resolveAlignCoords(evt));
    }

    handleMouseMove(evt) {
      const coords = this.resolveAlignCoords(evt);

      if (
        !this.lastCoords ||
        coords.row !== this.lastCoords.row ||
        coords.column !== this.lastCoords.column
      ) {
        this.props.handleAlignCharMouseOut(this.lastCoords);
        this.props.handleAlignCharMouseOver(coords);
        this.lastCoords = coords;
      }
    }

    handleMouseLeave(evt) {
      this.props.handleMouseLeave(evt);
    }

    handleMouseDown(evt) {
      this.props.handleMouseDown(evt);
    }

    handleScroll(evt) {
      this.props.handleScroll(
        this.rowsDivRef.current.scrollLeft,
        this.rowsDivRef.current.scrollTop,
      );
    }

    resolveAlignCoords(evt) {
      const {
        treeIndex,
        alignIndex,
        treeLayout,
        alignLayout,
        data,
      } = this.props;
      const { rowData } = data;
      const x = evt.nativeEvent.offsetX;
      const y = evt.nativeEvent.offsetY;
      let row;
      let column;
      for (row = 0; row < treeIndex.nodes.length - 1; ++row) {
        if (
          treeLayout.rowY[row] <= y &&
          treeLayout.rowY[row] + treeLayout.rowHeight[row] > y
        ) {
          break;
        }
      }
      for (column = 0; column < alignIndex.columns - 1; ++column) {
        if (
          alignLayout.colX[column] <= x &&
          alignLayout.colX[column] + alignLayout.colWidth[column] > x
        ) {
          break;
        }
      }
      const node = treeIndex.nodes[row];
      const colToSeqPos = alignIndex.alignColToSeqPos[node];
      const seqPos = colToSeqPos && colToSeqPos[column];
      const seq = rowData[node];
      const c = seq && seq[column];
      const isGap = isGapChar(c);
      return { row, column, node, seqPos, c, isGap };
    }

    render() {
      const {
        model,
        treeLayout,
        alignLayout,
        data,
        alignIndex,
        treeIndex,
        computedFontConfig,
        scrollLeft,
        scrollTop,
        classes,
      } = this.props;
      const { hoverColumn } = model;
      const { treeHeight } = treeLayout;
      const { alignWidth } = alignLayout;

      return (
        <div
          className={classes.alignmentRows}
          ref={this.rowsDivRef}
          style={{
            width: alignWidth,
            height: treeHeight,
          }}
          onClick={this.handleClick.bind(this)}
          onScroll={this.handleScroll.bind(this)}
        >
          <MSAAlignCanvas
            data={data}
            treeIndex={treeIndex}
            alignIndex={alignIndex}
            treeLayout={treeLayout}
            alignLayout={alignLayout}
            computedFontConfig={computedFontConfig}
            scrollLeft={scrollLeft}
            scrollTop={scrollTop}
            clientWidth={this.state.clientWidth}
            clientHeight={this.state.clientHeight}
          />

          {hoverColumn !== null ? (
            <div
              className={classes.alignmentColumnCursor}
              style={{
                left: alignLayout.colX[hoverColumn],
                top: 0,
                width: alignLayout.colWidth[hoverColumn],
                height: treeLayout.treeHeight,
              }}
            />
          ) : null}

          <div
            className={classes.alignmentRowsBack}
            style={{
              width: alignWidth,
              height: treeHeight,
              zIndex: 1000,
              position: "absolute",
              top: 0,
              left: 0,
            }}
            onMouseMove={this.handleMouseMove.bind(this)}
            onMouseLeave={this.handleMouseLeave.bind(this)}
            onMouseDown={this.handleMouseDown.bind(this)}
          />
        </div>
      );
    }
  }

  return withStyles(styles)(observer(MSAAlignRows));
}
