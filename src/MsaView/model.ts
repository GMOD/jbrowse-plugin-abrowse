import BaseViewModel from "@jbrowse/core/pluggableElementTypes/models/BaseViewModel";
import PluginManager from "@jbrowse/core/PluginManager";
import * as Clustal from "clustal-js";
import * as d3 from "d3";
import parseNewick from "./parseNewick";
import Stockholm from "stockholm-js";

class ClustalMSA {
  private MSA: any;
  constructor(text: string) {
    this.MSA = Clustal.parse(text);
  }

  getMSA() {
    return this.MSA;
  }

  getRow(name: string) {
    return this.MSA.alns.find((aln: any) => aln.id === name)?.seq.split("");
  }

  getWidth() {
    return this.MSA.alns[0].seq.length;
  }

  getTree() {
    return {};
  }
}

class StockholmMSA {
  private MSA: any;
  constructor(text: string) {
    const res = Stockholm.parseAll(text);
    this.MSA = res[0];
  }

  getMSA() {
    return this.MSA;
  }

  getRow(name: string) {
    return this.MSA?.seqdata[name]?.split("");
  }

  getWidth() {
    const name = Object.keys(this.MSA?.seqdata)[0];
    return this.getRow(name).length;
  }

  getTree() {
    return generateNodeNames(parseNewick(this.MSA?.gf.NH[0]));
  }
}

function setBrLength(d: any, y0: number, k: number) {
  d.len = (y0 += Math.max(d.data.length, 0)) * k;
  if (d.children) {
    d.children.forEach((d: any) => {
      setBrLength(d, y0, k);
    });
  }
}

function maxLength(d: any): number {
  return d.data.length + (d.children ? d3.max(d.children, maxLength) : 0);
}

function generateNodeNames(tree: any, parent = "node", depth = 0, index = 0) {
  if (tree.name === "") {
    tree.name = `${parent}-${depth}-${index}`;
  }
  if (tree.branchset?.length) {
    tree.branchset.forEach((b: any, index: number) =>
      generateNodeNames(b, tree.name, depth + 1, index),
    );
  }

  return tree;
}
function filter(tree: any, collapsed: any) {
  const { branchset, ...rest } = tree;
  if (collapsed.includes(tree.name)) {
    return {
      ...rest,
      // branchset: branchset.map((b: any) => ({ name: b.name })),
    };
  } else if (tree.branchset) {
    return {
      ...rest,
      branchset: branchset.map((b: any) => filter(b, collapsed)),
    };
  } else {
    return tree;
  }
}

export default function stateModelFactory(pluginManager: PluginManager) {
  const { jbrequire } = pluginManager;
  const { types, addDisposer } = pluginManager.lib["mobx-state-tree"];
  const { FileLocation, ElementId } = jbrequire("@jbrowse/core/util/types/mst");
  const { openLocation } = jbrequire("@jbrowse/core/util/io");
  const { autorun } = jbrequire("mobx");
  return types.snapshotProcessor(
    types.compose(
      BaseViewModel,
      types
        .model("MsaView", {
          id: ElementId,
          type: types.literal("MsaView"),
          height: 600,
          treeWidth: 400,
          pxPerBp: 16,
          showBranchLen: true,
          bgColor: true,
          treeFilehandle: types.maybe(FileLocation),
          msaFilehandle: types.maybe(FileLocation),
          data: types.optional(
            types
              .model({
                tree: types.maybe(types.string),
                msa: types.maybe(types.string),
                collapsed: types.array(types.string),
              })
              .actions(self => ({
                setTree(tree?: string) {
                  self.tree = tree;
                },
                setMSA(msa?: string) {
                  self.msa = msa;
                },
                toggleCollapsed(node: string) {
                  //IMSTArray doesn't recognize that it does have includes and
                  //@ts-ignore
                  if (self.collapsed.includes(node)) {
                    //@ts-ignore
                    self.collapsed.remove(node);
                  } else {
                    self.collapsed.push(node);
                  }
                },
              })),
            { tree: "", msa: "", collapsed: [] },
          ),
        })
        .volatile(() => ({
          error: undefined as Error | undefined,
          volatileWidth: 0,
          margin: { left: 20, top: 20 },
        }))
        .actions(self => ({
          setError(error?: Error) {
            self.error = error;
          },

          toggleBranchLen() {
            self.showBranchLen = !self.showBranchLen;
          },
          toggleBgColor() {
            self.bgColor = !self.bgColor;
          },

          setData(data: any) {
            self.data = data;
          },

          setWidth(width: number) {
            self.volatileWidth = width;
          },

          async setMSAFilehandle(r: any) {
            if (r.blob) {
              const text = await openLocation(r).readFile("utf8");
              self.data.setMSA(text);
            } else {
              self.msaFilehandle = r;
            }
          },
          async setTreeFilehandle(r: any) {
            if (r.blob) {
              const text = await openLocation(r).readFile("utf8");
              self.data.setTree(text);
            } else {
              self.treeFilehandle = r;
            }
          },

          afterAttach() {
            addDisposer(
              self,
              autorun(async () => {
                if (self.treeFilehandle) {
                  const f = openLocation(self.treeFilehandle);
                  const result = await f.readFile("utf8");
                  self.data.setTree(result);
                }
                if (self.msaFilehandle) {
                  const f = openLocation(self.msaFilehandle);
                  const result = await f.readFile("utf8");
                  self.data.setMSA(result);
                }
              }),
            );
          },
        }))
        .views(self => ({
          get initialized() {
            return self.data.msa || self.data.tree;
          },

          get collapsed() {
            return self.data.collapsed;
          },

          get done() {
            return self.volatileWidth > 0 && this.initialized;
          },

          get menuItems() {
            return [];
          },

          get MSA() {
            const text = self.data.msa;
            if (text) {
              if (Stockholm.sniff(text)) {
                return new StockholmMSA(text);
              } else {
                return new ClustalMSA(text);
              }
            }
            return null;
          },
          get width() {
            return self.volatileWidth;
          },

          get msaWidth() {
            return this.MSA?.getWidth() * self.pxPerBp;
          },

          get tree() {
            return filter(
              self.data.tree
                ? generateNodeNames(parseNewick(self.data.tree))
                : this.MSA?.getTree(),
              this.collapsed,
            );
          },

          get root() {
            return (
              d3
                //@ts-ignore
                .hierarchy(this.tree, d => d.branchset)
                //@ts-ignore
                .sum(d => (d.branchset ? 0 : 1))
                .sort((a: any, b: any) => {
                  return (
                    a.value - b.value ||
                    d3.ascending(a.data.length, b.data.length)
                  );
                })
            );
          },

          get realWidth() {
            return self.treeWidth - 200;
          },

          get hierarchy() {
            const cluster = d3
              .cluster()
              .size([this.totalHeight, this.realWidth])
              .separation((_1: any, _2: any) => 1);
            cluster(this.root);
            setBrLength(
              this.root,
              //@ts-ignore
              (this.root.data.length = 0),
              this.realWidth / maxLength(this.root),
            );
            return this.root;
          },

          get nodePositions() {
            return this.hierarchy.leaves().map((d: any) => {
              return { name: d.data.name, x: d.x, y: d.y };
            });
          },

          get totalHeight() {
            return this.root.leaves().length * 20;
          },
        })),
    ),
    {
      postProcessor(snap) {
        const result = JSON.parse(JSON.stringify(snap));
        console.log({ result });
        if (result.treeFilehandle) {
          delete result.data.tree;
        }
        if (result.msaFilehandle) {
          delete result.data.msa;
        }
        return result;
      },
    },
  );
}

// export type MsaViewStateModel = ReturnType<typeof stateModelFactory>;
// export type MsaViewModel = Instance<MsaViewStateModel>;
