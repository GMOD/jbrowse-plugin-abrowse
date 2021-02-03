import PluginManager from "@jbrowse/core/PluginManager";
import ImportFormComponent from "./ImportForm";
import colorSchemes from "./colorSchemes";
import Color from "color";
import FolderOpenIcon from "@material-ui/icons/FolderOpen";
import SettingsIcon from "@material-ui/icons/Settings";
import normalizeWheel from "normalize-wheel";
import { blockSize } from "../model";

const defaultColorScheme = "maeditor";
const colorScheme = colorSchemes[defaultColorScheme];

export default (pluginManager: PluginManager) => {
  const { jbrequire } = pluginManager;
  const React = jbrequire("react");
  const { useEffect, useRef, useState } = React;
  const { observer } = jbrequire("mobx-react");
  const { useTheme } = jbrequire("@material-ui/core/styles");
  const {
    IconButton,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    FormControlLabel,
    TextField,
    Button,
    Checkbox,
  } = jbrequire("@material-ui/core");
  const ImportForm = jbrequire(ImportFormComponent);

  const Block = observer(
    ({
      model,
      height,
      offset,
    }: {
      model: any;
      height: number;
      offset: number;
    }) => {
      const ref = useRef();
      const {
        hierarchy,
        rowHeight,
        scrollY,
        width,
        showBranchLen,
        collapsed,
      } = model;
      useEffect(() => {
        const ctx = ref.current.getContext("2d");

        ctx.resetTransform();
        ctx.clearRect(0, 0, width, blockSize);
        ctx.translate(200, -offset);

        hierarchy.links().forEach(({ source, target }: any) => {
          const y = showBranchLen ? "len" : "y";
          const { x: sx, [y]: sy } = source;
          const { x: tx, [y]: ty } = target;

          const y1 = offset;
          const y2 = offset + blockSize;
          const x1 = Math.min(sx, tx);
          const x2 = Math.max(sx, tx);
          //1d line intersection
          //https://eli.thegreenplace.net/2008/08/15/intersection-of-1d-segments
          if (x2 >= y1 && y2 >= x1) {
            ctx.beginPath();
            ctx.moveTo(sy, sx);
            ctx.lineTo(sy, tx);
            ctx.lineTo(ty, tx);
            ctx.stroke();
          }
        });
        if (rowHeight >= 10) {
          hierarchy.links().forEach(({ source, target }: any) => {
            const y = showBranchLen ? "len" : "y";
            const {
              x: sx,
              [y]: sy,
              data: { name: sourceName },
            } = source;
            const {
              x: tx,
              [y]: ty,
              data: { name: targetName },
            } = target;

            //-5 and +5 for boundaries
            if (sx > offset - 5 && sx < offset + blockSize + 5) {
              ctx.strokeStyle = "black";
              ctx.fillStyle = collapsed.includes(sourceName)
                ? "black"
                : "white";
              ctx.beginPath();
              ctx.arc(sy, sx, 3.5, 0, 2 * Math.PI);
              ctx.fill();
              ctx.stroke();

              if (collapsed.includes(target.data.name)) {
                ctx.fillStyle = collapsed.includes(targetName)
                  ? "black"
                  : "white";
                ctx.beginPath();
                ctx.arc(ty, tx, 3.5, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
              }
            }
          });

          ctx.fillStyle = "black";
          hierarchy.leaves().forEach((node: any) => {
            const { x, y, data, len } = node;
            const { name } = data;
            //-5 and +5 for boundaries
            if (x > offset - 5 && x < offset + blockSize + 5) {
              ctx.fillText(name, showBranchLen ? len : y, x + 4);
            }
          });
        }
      }, [collapsed, rowHeight, hierarchy, offset, width, showBranchLen]);
      return (
        <canvas
          width={width}
          height={height}
          style={{
            width,
            height,
            top: scrollY + offset,
            left: 0,
            position: "absolute",
          }}
          ref={ref}
        />
      );
    },
  );
  const TreeCanvas = observer(({ model }: { model: any }) => {
    const divRef = useRef();
    const scheduled = useRef(false);
    const delta = useRef(0);

    useEffect(() => {
      const curr = divRef.current;
      if (!divRef.current) {
        return;
      }
      function onWheel(origEvent: WheelEvent) {
        const event = normalizeWheel(origEvent);
        delta.current += event.pixelY;

        if (!scheduled.current) {
          scheduled.current = true;
          requestAnimationFrame(() => {
            model.doScrollY(-delta.current);
            delta.current = 0;
            scheduled.current = false;
          });
        }
        origEvent.preventDefault();
      }
      curr.addEventListener("wheel", onWheel);
      return () => {
        curr.removeEventListener("wheel", onWheel);
      };
    }, [model]);

    return (
      <div
        ref={divRef}
        style={{
          height: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {model.blocks.map((block: number) => (
          <Block key={block} model={model} offset={block} height={blockSize} />
        ))}
      </div>
    );
  });

  const MSA = observer(({ model }: { model: any }) => {
    const { MSA, pxPerBp, bgColor, margin, rowHeight } = model;
    const theme = useTheme();
    const ref = useRef();
    if (!MSA) {
      return null;
    }

    const { hierarchy, totalHeight } = model;
    useEffect(() => {
      if (!ref.current) {
        return;
      }

      const { width: w, height: h } = ref.current.getBoundingClientRect();

      ref.current.width = w;
      ref.current.height = h;

      const ctx = ref.current.getContext("2d");
      if (!ctx) {
        return;
      }
      ctx.clearRect(0, 0, w, h);
      //fudge factor
      ctx.translate(0, 8 + margin.top);
      ctx.textAlign = "center";

      hierarchy.leaves().map((node: any) => {
        const {
          x,
          data: { name },
        } = node;
        return MSA.getRow(name)?.map((letter: string, index: number) => {
          const color = (colorScheme as any)[letter];
          const contrast = color
            ? theme.palette.getContrastText(Color(color).hex())
            : "black";
          if (bgColor) {
            ctx.fillStyle = color || "white";
            ctx.fillRect(index * pxPerBp, x - rowHeight, pxPerBp, rowHeight);
          }
          ctx.fillStyle = bgColor ? contrast : color || "black";
          ctx.fillText(
            letter,
            index * pxPerBp + pxPerBp / 2,
            x - rowHeight / 4,
          );
        });
      });
    }, [MSA, bgColor, pxPerBp, hierarchy, margin.top, theme.palette]);

    return <canvas ref={ref} style={{ width: "100%", height: "100%" }} />;
  });

  const SettingsDialog = observer(
    ({
      model,
      onClose,
      open,
    }: {
      model: any;
      onClose: Function;
      open: boolean;
    }) => {
      const [rowHeight, setRowHeight] = useState(model.rowHeight);
      return (
        <Dialog onClose={() => onClose()} open={open}>
          <DialogTitle>Settings</DialogTitle>
          <DialogContent>
            <FormControlLabel
              control={
                <Checkbox
                  checked={model.showBranchLen}
                  onChange={() => model.toggleBranchLen()}
                />
              }
              label="Show branch length"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={model.bgColor}
                  onChange={() => model.toggleBgColor()}
                />
              }
              label="Color background"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={model.bgColor}
                  onChange={() => model.toggleBgColor()}
                />
              }
              label="Color background"
            />
            <TextField
              label="Row height"
              value={rowHeight}
              onChange={(event: any) => setRowHeight(event.target.value)}
            />
            <Button
              onClick={() => {
                model.setRowHeight(+rowHeight);
                onClose();
              }}
            >
              Submit
            </Button>
          </DialogContent>
        </Dialog>
      );
    },
  );
  return observer(({ model }: { model: any }) => {
    const { done, initialized } = model;
    const [settingsDialogVisible, setSettingsDialogVisible] = useState(false);

    if (!initialized) {
      return <ImportForm model={model} />;
    } else if (!done) {
      return <Typography variant="h4">Loading...</Typography>;
    } else {
      const { height } = model;

      return (
        <div style={{ height }}>
          <div style={{ display: "block" }}>
            <IconButton
              onClick={() => {
                model.setData({ tree: "", msa: "" });
                model.setTreeFilehandle(undefined);
                model.setMSAFilehandle(undefined);
                model.setScrollY(0);
              }}
            >
              <FolderOpenIcon />
            </IconButton>
            <IconButton
              onClick={() => {
                setSettingsDialogVisible(true);
              }}
            >
              <SettingsIcon />
            </IconButton>
            <SettingsDialog
              open={settingsDialogVisible}
              model={model}
              onClose={() => setSettingsDialogVisible(false)}
            />
          </div>
          <div
            style={{
              height: "100%",
              position: "relative",
            }}
          >
            <TreeCanvas model={model} />
          </div>
        </div>
      );
    }
  });
};
