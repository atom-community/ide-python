// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

require("./mainPanel.css");

const lodash_1 = require("lodash");

const React = require("react");

const constants_1 = require("../../client/datascience/constants");

const types_1 = require("../../client/datascience/types");

const errorBoundary_1 = require("../react-common/errorBoundary");

const locReactSide_1 = require("../react-common/locReactSide");

const postOffice_1 = require("../react-common/postOffice");

const progress_1 = require("../react-common/progress");

const relativeImage_1 = require("../react-common/relativeImage");

const cell_1 = require("./cell");

const cellButton_1 = require("./cellButton");

const mainPanelState_1 = require("./mainPanelState");

const menuBar_1 = require("./menuBar");

class MainPanel extends React.Component {
  // tslint:disable-next-line:max-func-body-length
  constructor(props, state) {
    super(props);
    this.stackLimit = 10; // tslint:disable-next-line:no-any

    this.handleMessage = (msg, payload) => {
      switch (msg) {
        case constants_1.HistoryMessages.StartCell:
          this.addCell(payload);
          return true;

        case constants_1.HistoryMessages.FinishCell:
          this.finishCell(payload);
          return true;

        case constants_1.HistoryMessages.UpdateCell:
          this.updateCell(payload);
          return true;

        case constants_1.HistoryMessages.GetAllCells:
          this.getAllCells();
          return true;

        case constants_1.HistoryMessages.StartProgress:
          if (!this.props.ignoreProgress) {
            this.setState({
              busy: true
            });
          }

          break;

        case constants_1.HistoryMessages.StopProgress:
          if (!this.props.ignoreProgress) {
            this.setState({
              busy: false
            });
          }

          break;

        default:
          break;
      }

      return false;
    };

    this.getAllCells = () => {
      // Send all of our cells back to the other side
      const cells = this.state.cellVMs.map(cellVM => {
        return cellVM.cell;
      });
      postOffice_1.PostOffice.sendMessage({
        type: constants_1.HistoryMessages.ReturnAllCells,
        payload: cells
      });
    };

    this.renderExtraButtons = () => {
      if (!this.props.skipDefault) {
        return React.createElement(cellButton_1.CellButton, {
          theme: this.props.theme,
          onClick: this.addMarkdown,
          tooltip: 'Add Markdown Test'
        }, "M");
      }

      return null;
    };

    this.renderCells = () => {
      return this.state.cellVMs.map((cellVM, index) => React.createElement(errorBoundary_1.ErrorBoundary, {
        key: index
      }, React.createElement(cell_1.Cell, {
        cellVM: cellVM,
        theme: this.props.theme,
        gotoCode: () => this.gotoCellCode(index),
        delete: () => this.deleteCell(index)
      })));
    };

    this.addMarkdown = () => {
      this.addCell({
        data: {
          cell_type: 'markdown',
          metadata: {},
          source: ['## Cell 3\n', 'Here\'s some markdown\n', '- A List\n', '- Of Items']
        },
        id: '1111',
        file: 'foo.py',
        line: 0,
        state: types_1.CellState.finished
      });
    };

    this.collapseAll = () => {
      postOffice_1.PostOffice.sendMessage({
        type: constants_1.HistoryMessages.CollapseAll,
        payload: {}
      });
      const newCells = this.state.cellVMs.map(value => {
        if (value.inputBlockOpen) {
          return this.toggleCellVM(value);
        } else {
          return Object.assign({}, value);
        }
      }); // Now assign our new array copy to state

      this.setState({
        cellVMs: newCells,
        skipNextScroll: true
      });
    };

    this.expandAll = () => {
      postOffice_1.PostOffice.sendMessage({
        type: constants_1.HistoryMessages.ExpandAll,
        payload: {}
      });
      const newCells = this.state.cellVMs.map(value => {
        if (!value.inputBlockOpen) {
          return this.toggleCellVM(value);
        } else {
          return Object.assign({}, value);
        }
      }); // Now assign our new array copy to state

      this.setState({
        cellVMs: newCells,
        skipNextScroll: true
      });
    };

    this.canCollapseAll = () => {
      return this.state.cellVMs.length > 0;
    };

    this.canExpandAll = () => {
      return this.state.cellVMs.length > 0;
    };

    this.canExport = () => {
      return this.state.cellVMs.length > 0;
    };

    this.canRedo = () => {
      return this.state.redoStack.length > 0;
    };

    this.canUndo = () => {
      return this.state.undoStack.length > 0;
    };

    this.pushStack = (stack, cells) => {
      // Get the undo stack up to the maximum length
      const slicedUndo = stack.slice(0, lodash_1.min([stack.length, this.stackLimit])); // Combine this with our set of cells

      return [...slicedUndo, cells];
    };

    this.gotoCellCode = index => {
      // Find our cell
      const cellVM = this.state.cellVMs[index]; // Send a message to the other side to jump to a particular cell

      postOffice_1.PostOffice.sendMessage({
        type: constants_1.HistoryMessages.GotoCodeCell,
        payload: {
          file: cellVM.cell.file,
          line: cellVM.cell.line
        }
      });
    };

    this.deleteCell = index => {
      postOffice_1.PostOffice.sendMessage({
        type: constants_1.HistoryMessages.DeleteCell,
        payload: {}
      }); // Update our state

      this.setState({
        cellVMs: this.state.cellVMs.filter((c, i) => {
          return i !== index;
        }),
        undoStack: this.pushStack(this.state.undoStack, this.state.cellVMs),
        skipNextScroll: true
      });
    };

    this.clearAll = () => {
      postOffice_1.PostOffice.sendMessage({
        type: constants_1.HistoryMessages.DeleteAllCells,
        payload: {}
      }); // Update our state

      this.setState({
        cellVMs: [],
        undoStack: this.pushStack(this.state.undoStack, this.state.cellVMs),
        skipNextScroll: true,
        busy: false // No more progress on delete all

      });
    };

    this.redo = () => {
      // Pop one off of our redo stack and update our undo
      const cells = this.state.redoStack[this.state.redoStack.length - 1];
      const redoStack = this.state.redoStack.slice(0, this.state.redoStack.length - 1);
      const undoStack = this.pushStack(this.state.undoStack, this.state.cellVMs);
      postOffice_1.PostOffice.sendMessage({
        type: constants_1.HistoryMessages.Redo,
        payload: {}
      });
      this.setState({
        cellVMs: cells,
        undoStack: undoStack,
        redoStack: redoStack,
        skipNextScroll: true
      });
    };

    this.undo = () => {
      // Pop one off of our undo stack and update our redo
      const cells = this.state.undoStack[this.state.undoStack.length - 1];
      const undoStack = this.state.undoStack.slice(0, this.state.undoStack.length - 1);
      const redoStack = this.pushStack(this.state.redoStack, this.state.cellVMs);
      postOffice_1.PostOffice.sendMessage({
        type: constants_1.HistoryMessages.Undo,
        payload: {}
      });
      this.setState({
        cellVMs: cells,
        undoStack: undoStack,
        redoStack: redoStack,
        skipNextScroll: true
      });
    };

    this.restartKernel = () => {
      // Send a message to the other side to restart the kernel
      postOffice_1.PostOffice.sendMessage({
        type: constants_1.HistoryMessages.RestartKernel,
        payload: {}
      });
    };

    this.export = () => {
      // Send a message to the other side to export our current list
      const cellContents = this.state.cellVMs.map((cellVM, index) => {
        return cellVM.cell;
      });
      postOffice_1.PostOffice.sendMessage({
        type: constants_1.HistoryMessages.Export,
        payload: {
          contents: cellContents
        }
      });
    };

    this.scrollToBottom = () => {
      if (this.bottom && this.bottom.scrollIntoView && !this.state.skipNextScroll) {
        // Delay this until we are about to render. React hasn't setup the size of the bottom element
        // yet so we need to delay. 10ms looks good from a user point of view
        setTimeout(() => {
          if (this.bottom) {
            this.bottom.scrollIntoView({
              behavior: 'smooth',
              block: 'end',
              inline: 'end'
            });
          }
        }, 100);
      }
    };

    this.updateBottom = newBottom => {
      if (newBottom !== this.bottom) {
        this.bottom = newBottom;
      }
    }; // tslint:disable-next-line:no-any


    this.addCell = payload => {
      if (payload) {
        const cell = payload;
        const cellVM = mainPanelState_1.createCellVM(cell, this.inputBlockToggled);

        if (cellVM) {
          this.setState({
            cellVMs: [...this.state.cellVMs, cellVM],
            undoStack: this.pushStack(this.state.undoStack, this.state.cellVMs),
            redoStack: this.state.redoStack,
            skipNextScroll: false
          });
        }
      }
    };

    this.inputBlockToggled = id => {
      // Create a shallow copy of the array, let not const as this is the shallow array copy that we will be changing
      const cellVMArray = [...this.state.cellVMs];
      const cellVMIndex = cellVMArray.findIndex(value => {
        return value.cell.id === id;
      });

      if (cellVMIndex >= 0) {
        // Const here as this is the state object pulled off of our shallow array copy, we don't want to mutate it
        const targetCellVM = cellVMArray[cellVMIndex]; // Mutate the shallow array copy

        cellVMArray[cellVMIndex] = this.toggleCellVM(targetCellVM);
        this.setState({
          skipNextScroll: true,
          cellVMs: cellVMArray
        });
      }
    }; // Toggle the input collapse state of a cell view model return a shallow copy with updated values


    this.toggleCellVM = cellVM => {
      let newCollapseState = cellVM.inputBlockOpen;
      let newText = cellVM.inputBlockText;

      if (cellVM.cell.data.cell_type === 'code') {
        newCollapseState = !newCollapseState;
        newText = this.extractInputText(cellVM.cell);

        if (!newCollapseState) {
          if (newText.length > 0) {
            newText = newText.split('\n', 1)[0];
            newText = newText.slice(0, 255); // Slice to limit length of string, slicing past the string length is fine

            newText = newText.concat('...');
          }
        }
      }

      return Object.assign({}, cellVM, {
        inputBlockOpen: newCollapseState,
        inputBlockText: newText
      });
    };

    this.extractInputText = cell => {
      return cell_1.Cell.concatMultilineString(cell.data.source);
    };

    this.updateOrAdd = (cell, allowAdd) => {
      const index = this.state.cellVMs.findIndex(c => c.cell.id === cell.id);

      if (index >= 0) {
        // Update this cell
        this.state.cellVMs[index].cell = cell;
        this.forceUpdate();
      } else if (allowAdd) {
        // This is an entirely new cell (it may have started out as finished)
        this.addCell(cell);
      }
    }; // tslint:disable-next-line:no-any


    this.finishCell = payload => {
      if (payload) {
        const cell = payload;

        if (cell) {
          this.updateOrAdd(cell, true);
        }
      }
    }; // tslint:disable-next-line:no-any


    this.updateCell = payload => {
      if (payload) {
        const cell = payload;

        if (cell) {
          this.updateOrAdd(cell, false);
        }
      }
    }; // Default state should show a busy message


    this.state = {
      cellVMs: [],
      busy: true,
      undoStack: [],
      redoStack: []
    };

    if (!this.props.skipDefault) {
      this.state = mainPanelState_1.generateTestState(this.inputBlockToggled);
    }
  }

  componentDidMount() {
    this.scrollToBottom();
  }

  componentDidUpdate(prevProps, prevState) {
    this.scrollToBottom();
  }

  render() {
    const clearButtonImage = this.props.theme !== 'vscode-dark' ? './images/Cancel/Cancel_16xMD_vscode.svg' : './images/Cancel/Cancel_16xMD_vscode_dark.svg';
    const redoImage = this.props.theme !== 'vscode-dark' ? './images/Redo/Redo_16x_vscode.svg' : './images/Redo/Redo_16x_vscode_dark.svg';
    const undoImage = this.props.theme !== 'vscode-dark' ? './images/Undo/Undo_16x_vscode.svg' : './images/Undo/Undo_16x_vscode_dark.svg';
    const restartImage = this.props.theme !== 'vscode-dark' ? './images/Restart/Restart_grey_16x_vscode.svg' : './images/Restart/Restart_grey_16x_vscode_dark.svg';
    const saveAsImage = this.props.theme !== 'vscode-dark' ? './images/SaveAs/SaveAs_16x_vscode.svg' : './images/SaveAs/SaveAs_16x_vscode_dark.svg';
    const collapseAllImage = this.props.theme !== 'vscode-dark' ? './images/CollapseAll/CollapseAll_16x_vscode.svg' : './images/CollapseAll/CollapseAll_16x_vscode_dark.svg';
    const expandAllImage = this.props.theme !== 'vscode-dark' ? './images/ExpandAll/ExpandAll_16x_vscode.svg' : './images/ExpandAll/ExpandAll_16x_vscode_dark.svg';
    const progressBar = this.state.busy && !this.props.ignoreProgress ? React.createElement(progress_1.Progress, null) : undefined;
    return React.createElement("div", {
      className: 'main-panel'
    }, React.createElement(postOffice_1.PostOffice, {
      messageHandlers: [this]
    }), React.createElement(menuBar_1.MenuBar, {
      theme: this.props.theme,
      stylePosition: 'top-fixed'
    }, this.renderExtraButtons(), React.createElement(cellButton_1.CellButton, {
      theme: this.props.theme,
      onClick: this.collapseAll,
      disabled: !this.canCollapseAll(),
      tooltip: locReactSide_1.getLocString('DataScience.collapseAll', 'Collapse all cell inputs')
    }, React.createElement(relativeImage_1.RelativeImage, {
      class: 'cell-button-image',
      path: collapseAllImage
    })), React.createElement(cellButton_1.CellButton, {
      theme: this.props.theme,
      onClick: this.expandAll,
      disabled: !this.canExpandAll(),
      tooltip: locReactSide_1.getLocString('DataScience.expandAll', 'Expand all cell inputs')
    }, React.createElement(relativeImage_1.RelativeImage, {
      class: 'cell-button-image',
      path: expandAllImage
    })), React.createElement(cellButton_1.CellButton, {
      theme: this.props.theme,
      onClick: this.export,
      disabled: !this.canExport(),
      tooltip: locReactSide_1.getLocString('DataScience.export', 'Export as Jupyter Notebook')
    }, React.createElement(relativeImage_1.RelativeImage, {
      class: 'cell-button-image',
      path: saveAsImage
    })), React.createElement(cellButton_1.CellButton, {
      theme: this.props.theme,
      onClick: this.restartKernel,
      tooltip: locReactSide_1.getLocString('DataScience.restartServer', 'Restart iPython Kernel')
    }, React.createElement(relativeImage_1.RelativeImage, {
      class: 'cell-button-image',
      path: restartImage
    })), React.createElement(cellButton_1.CellButton, {
      theme: this.props.theme,
      onClick: this.undo,
      disabled: !this.canUndo(),
      tooltip: locReactSide_1.getLocString('DataScience.undo', 'Undo')
    }, React.createElement(relativeImage_1.RelativeImage, {
      class: 'cell-button-image',
      path: undoImage
    })), React.createElement(cellButton_1.CellButton, {
      theme: this.props.theme,
      onClick: this.redo,
      disabled: !this.canRedo(),
      tooltip: locReactSide_1.getLocString('DataScience.redo', 'Redo')
    }, React.createElement(relativeImage_1.RelativeImage, {
      class: 'cell-button-image',
      path: redoImage
    })), React.createElement(cellButton_1.CellButton, {
      theme: this.props.theme,
      onClick: this.clearAll,
      tooltip: locReactSide_1.getLocString('DataScience.clearAll', 'Remove All Cells')
    }, React.createElement(relativeImage_1.RelativeImage, {
      class: 'cell-button-image',
      path: clearButtonImage
    }))), React.createElement("div", {
      className: 'top-spacing'
    }), progressBar, this.renderCells(), React.createElement("div", {
      ref: this.updateBottom
    }));
  }

}

exports.MainPanel = MainPanel;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIk1haW5QYW5lbC5qcyJdLCJuYW1lcyI6WyJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsImV4cG9ydHMiLCJ2YWx1ZSIsInJlcXVpcmUiLCJsb2Rhc2hfMSIsIlJlYWN0IiwiY29uc3RhbnRzXzEiLCJ0eXBlc18xIiwiZXJyb3JCb3VuZGFyeV8xIiwibG9jUmVhY3RTaWRlXzEiLCJwb3N0T2ZmaWNlXzEiLCJwcm9ncmVzc18xIiwicmVsYXRpdmVJbWFnZV8xIiwiY2VsbF8xIiwiY2VsbEJ1dHRvbl8xIiwibWFpblBhbmVsU3RhdGVfMSIsIm1lbnVCYXJfMSIsIk1haW5QYW5lbCIsIkNvbXBvbmVudCIsImNvbnN0cnVjdG9yIiwicHJvcHMiLCJzdGF0ZSIsInN0YWNrTGltaXQiLCJoYW5kbGVNZXNzYWdlIiwibXNnIiwicGF5bG9hZCIsIkhpc3RvcnlNZXNzYWdlcyIsIlN0YXJ0Q2VsbCIsImFkZENlbGwiLCJGaW5pc2hDZWxsIiwiZmluaXNoQ2VsbCIsIlVwZGF0ZUNlbGwiLCJ1cGRhdGVDZWxsIiwiR2V0QWxsQ2VsbHMiLCJnZXRBbGxDZWxscyIsIlN0YXJ0UHJvZ3Jlc3MiLCJpZ25vcmVQcm9ncmVzcyIsInNldFN0YXRlIiwiYnVzeSIsIlN0b3BQcm9ncmVzcyIsImNlbGxzIiwiY2VsbFZNcyIsIm1hcCIsImNlbGxWTSIsImNlbGwiLCJQb3N0T2ZmaWNlIiwic2VuZE1lc3NhZ2UiLCJ0eXBlIiwiUmV0dXJuQWxsQ2VsbHMiLCJyZW5kZXJFeHRyYUJ1dHRvbnMiLCJza2lwRGVmYXVsdCIsImNyZWF0ZUVsZW1lbnQiLCJDZWxsQnV0dG9uIiwidGhlbWUiLCJvbkNsaWNrIiwiYWRkTWFya2Rvd24iLCJ0b29sdGlwIiwicmVuZGVyQ2VsbHMiLCJpbmRleCIsIkVycm9yQm91bmRhcnkiLCJrZXkiLCJDZWxsIiwiZ290b0NvZGUiLCJnb3RvQ2VsbENvZGUiLCJkZWxldGUiLCJkZWxldGVDZWxsIiwiZGF0YSIsImNlbGxfdHlwZSIsIm1ldGFkYXRhIiwic291cmNlIiwiaWQiLCJmaWxlIiwibGluZSIsIkNlbGxTdGF0ZSIsImZpbmlzaGVkIiwiY29sbGFwc2VBbGwiLCJDb2xsYXBzZUFsbCIsIm5ld0NlbGxzIiwiaW5wdXRCbG9ja09wZW4iLCJ0b2dnbGVDZWxsVk0iLCJhc3NpZ24iLCJza2lwTmV4dFNjcm9sbCIsImV4cGFuZEFsbCIsIkV4cGFuZEFsbCIsImNhbkNvbGxhcHNlQWxsIiwibGVuZ3RoIiwiY2FuRXhwYW5kQWxsIiwiY2FuRXhwb3J0IiwiY2FuUmVkbyIsInJlZG9TdGFjayIsImNhblVuZG8iLCJ1bmRvU3RhY2siLCJwdXNoU3RhY2siLCJzdGFjayIsInNsaWNlZFVuZG8iLCJzbGljZSIsIm1pbiIsIkdvdG9Db2RlQ2VsbCIsIkRlbGV0ZUNlbGwiLCJmaWx0ZXIiLCJjIiwiaSIsImNsZWFyQWxsIiwiRGVsZXRlQWxsQ2VsbHMiLCJyZWRvIiwiUmVkbyIsInVuZG8iLCJVbmRvIiwicmVzdGFydEtlcm5lbCIsIlJlc3RhcnRLZXJuZWwiLCJleHBvcnQiLCJjZWxsQ29udGVudHMiLCJFeHBvcnQiLCJjb250ZW50cyIsInNjcm9sbFRvQm90dG9tIiwiYm90dG9tIiwic2Nyb2xsSW50b1ZpZXciLCJzZXRUaW1lb3V0IiwiYmVoYXZpb3IiLCJibG9jayIsImlubGluZSIsInVwZGF0ZUJvdHRvbSIsIm5ld0JvdHRvbSIsImNyZWF0ZUNlbGxWTSIsImlucHV0QmxvY2tUb2dnbGVkIiwiY2VsbFZNQXJyYXkiLCJjZWxsVk1JbmRleCIsImZpbmRJbmRleCIsInRhcmdldENlbGxWTSIsIm5ld0NvbGxhcHNlU3RhdGUiLCJuZXdUZXh0IiwiaW5wdXRCbG9ja1RleHQiLCJleHRyYWN0SW5wdXRUZXh0Iiwic3BsaXQiLCJjb25jYXQiLCJjb25jYXRNdWx0aWxpbmVTdHJpbmciLCJ1cGRhdGVPckFkZCIsImFsbG93QWRkIiwiZm9yY2VVcGRhdGUiLCJnZW5lcmF0ZVRlc3RTdGF0ZSIsImNvbXBvbmVudERpZE1vdW50IiwiY29tcG9uZW50RGlkVXBkYXRlIiwicHJldlByb3BzIiwicHJldlN0YXRlIiwicmVuZGVyIiwiY2xlYXJCdXR0b25JbWFnZSIsInJlZG9JbWFnZSIsInVuZG9JbWFnZSIsInJlc3RhcnRJbWFnZSIsInNhdmVBc0ltYWdlIiwiY29sbGFwc2VBbGxJbWFnZSIsImV4cGFuZEFsbEltYWdlIiwicHJvZ3Jlc3NCYXIiLCJQcm9ncmVzcyIsInVuZGVmaW5lZCIsImNsYXNzTmFtZSIsIm1lc3NhZ2VIYW5kbGVycyIsIk1lbnVCYXIiLCJzdHlsZVBvc2l0aW9uIiwiZGlzYWJsZWQiLCJnZXRMb2NTdHJpbmciLCJSZWxhdGl2ZUltYWdlIiwiY2xhc3MiLCJwYXRoIiwicmVmIl0sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7O0FBQ0FBLE1BQU0sQ0FBQ0MsY0FBUCxDQUFzQkMsT0FBdEIsRUFBK0IsWUFBL0IsRUFBNkM7QUFBRUMsRUFBQUEsS0FBSyxFQUFFO0FBQVQsQ0FBN0M7O0FBQ0FDLE9BQU8sQ0FBQyxpQkFBRCxDQUFQOztBQUNBLE1BQU1DLFFBQVEsR0FBR0QsT0FBTyxDQUFDLFFBQUQsQ0FBeEI7O0FBQ0EsTUFBTUUsS0FBSyxHQUFHRixPQUFPLENBQUMsT0FBRCxDQUFyQjs7QUFDQSxNQUFNRyxXQUFXLEdBQUdILE9BQU8sQ0FBQyxvQ0FBRCxDQUEzQjs7QUFDQSxNQUFNSSxPQUFPLEdBQUdKLE9BQU8sQ0FBQyxnQ0FBRCxDQUF2Qjs7QUFDQSxNQUFNSyxlQUFlLEdBQUdMLE9BQU8sQ0FBQywrQkFBRCxDQUEvQjs7QUFDQSxNQUFNTSxjQUFjLEdBQUdOLE9BQU8sQ0FBQyw4QkFBRCxDQUE5Qjs7QUFDQSxNQUFNTyxZQUFZLEdBQUdQLE9BQU8sQ0FBQyw0QkFBRCxDQUE1Qjs7QUFDQSxNQUFNUSxVQUFVLEdBQUdSLE9BQU8sQ0FBQywwQkFBRCxDQUExQjs7QUFDQSxNQUFNUyxlQUFlLEdBQUdULE9BQU8sQ0FBQywrQkFBRCxDQUEvQjs7QUFDQSxNQUFNVSxNQUFNLEdBQUdWLE9BQU8sQ0FBQyxRQUFELENBQXRCOztBQUNBLE1BQU1XLFlBQVksR0FB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SixFQWNJN0ksS0FBSyxDQUFDOEMsYUFBTixDQUFvQnJDLFlBQVksQ0FBQ3NDLFVBQWpDLEVBQTZDO0FBQUVDLE1BQUFBLEtBQUssRUFBRSxLQUFLakMsS0FBTCxDQUFXaUMsS0FBcEI7QUFBMkJDLE1BQUFBLE9BQU8sRUFBRSxLQUFLZ0QsUUFBekM7QUFBbUQ5QyxNQUFBQSxPQUFPLEVBQUUvQyxjQUFjLENBQUN1SixZQUFmLENBQTRCLHNCQUE1QixFQUFvRCxrQkFBcEQ7QUFBNUQsS0FBN0MsRUFDSTNKLEtBQUssQ0FBQzhDLGFBQU4sQ0FBb0J2QyxlQUFlLENBQUNxSixhQUFwQyxFQUFtRDtBQUFFQyxNQUFBQSxLQUFLLEVBQUUsbUJBQVQ7QUFBOEJDLE1BQUFBLElBQUksRUFBRWxCO0FBQXBDLEtBQW5ELENBREosQ0FkSixDQUZJLEVBa0JKNUksS0FBSyxDQUFDOEMsYUFBTixDQUFvQixLQUFwQixFQUEyQjtBQUFFd0csTUFBQUEsU0FBUyxFQUFFO0FBQWIsS0FBM0IsQ0FsQkksRUFtQkpILFdBbkJJLEVBb0JKLEtBQUsvRixXQUFMLEVBcEJJLEVBcUJKcEQsS0FBSyxDQUFDOEMsYUFBTixDQUFvQixLQUFwQixFQUEyQjtBQUFFaUgsTUFBQUEsR0FBRyxFQUFFLEtBQUszQztBQUFaLEtBQTNCLENBckJJLENBQVI7QUFzQkg7O0FBN1VtQzs7QUErVXhDeEgsT0FBTyxDQUFDZ0IsU0FBUixHQUFvQkEsU0FBcEIiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cclxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxyXG4ndXNlIHN0cmljdCc7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxucmVxdWlyZShcIi4vbWFpblBhbmVsLmNzc1wiKTtcclxuY29uc3QgbG9kYXNoXzEgPSByZXF1aXJlKFwibG9kYXNoXCIpO1xyXG5jb25zdCBSZWFjdCA9IHJlcXVpcmUoXCJyZWFjdFwiKTtcclxuY29uc3QgY29uc3RhbnRzXzEgPSByZXF1aXJlKFwiLi4vLi4vY2xpZW50L2RhdGFzY2llbmNlL2NvbnN0YW50c1wiKTtcclxuY29uc3QgdHlwZXNfMSA9IHJlcXVpcmUoXCIuLi8uLi9jbGllbnQvZGF0YXNjaWVuY2UvdHlwZXNcIik7XHJcbmNvbnN0IGVycm9yQm91bmRhcnlfMSA9IHJlcXVpcmUoXCIuLi9yZWFjdC1jb21tb24vZXJyb3JCb3VuZGFyeVwiKTtcclxuY29uc3QgbG9jUmVhY3RTaWRlXzEgPSByZXF1aXJlKFwiLi4vcmVhY3QtY29tbW9uL2xvY1JlYWN0U2lkZVwiKTtcclxuY29uc3QgcG9zdE9mZmljZV8xID0gcmVxdWlyZShcIi4uL3JlYWN0LWNvbW1vbi9wb3N0T2ZmaWNlXCIpO1xyXG5jb25zdCBwcm9ncmVzc18xID0gcmVxdWlyZShcIi4uL3JlYWN0LWNvbW1vbi9wcm9ncmVzc1wiKTtcclxuY29uc3QgcmVsYXRpdmVJbWFnZV8xID0gcmVxdWlyZShcIi4uL3JlYWN0LWNvbW1vbi9yZWxhdGl2ZUltYWdlXCIpO1xyXG5jb25zdCBjZWxsXzEgPSByZXF1aXJlKFwiLi9jZWxsXCIpO1xyXG5jb25zdCBjZWxsQnV0dG9uXzEgPSByZXF1aXJlKFwiLi9jZWxsQnV0dG9uXCIpO1xyXG5jb25zdCBtYWluUGFuZWxTdGF0ZV8xID0gcmVxdWlyZShcIi4vbWFpblBhbmVsU3RhdGVcIik7XHJcbmNvbnN0IG1lbnVCYXJfMSA9IHJlcXVpcmUoXCIuL21lbnVCYXJcIik7XHJcbmNsYXNzIE1haW5QYW5lbCBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XHJcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bWF4LWZ1bmMtYm9keS1sZW5ndGhcclxuICAgIGNvbnN0cnVjdG9yKHByb3BzLCBzdGF0ZSkge1xyXG4gICAgICAgIHN1cGVyKHByb3BzKTtcclxuICAgICAgICB0aGlzLnN0YWNrTGltaXQgPSAxMDtcclxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XHJcbiAgICAgICAgdGhpcy5oYW5kbGVNZXNzYWdlID0gKG1zZywgcGF5bG9hZCkgPT4ge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKG1zZykge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5IaXN0b3J5TWVzc2FnZXMuU3RhcnRDZWxsOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQ2VsbChwYXlsb2FkKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuSGlzdG9yeU1lc3NhZ2VzLkZpbmlzaENlbGw6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5maW5pc2hDZWxsKHBheWxvYWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5IaXN0b3J5TWVzc2FnZXMuVXBkYXRlQ2VsbDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUNlbGwocGF5bG9hZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkhpc3RvcnlNZXNzYWdlcy5HZXRBbGxDZWxsczpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmdldEFsbENlbGxzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkhpc3RvcnlNZXNzYWdlcy5TdGFydFByb2dyZXNzOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5wcm9wcy5pZ25vcmVQcm9ncmVzcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKHsgYnVzeTogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkhpc3RvcnlNZXNzYWdlcy5TdG9wUHJvZ3Jlc3M6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLnByb3BzLmlnbm9yZVByb2dyZXNzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoeyBidXN5OiBmYWxzZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMuZ2V0QWxsQ2VsbHMgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIC8vIFNlbmQgYWxsIG9mIG91ciBjZWxscyBiYWNrIHRvIHRoZSBvdGhlciBzaWRlXHJcbiAgICAgICAgICAgIGNvbnN0IGNlbGxzID0gdGhpcy5zdGF0ZS5jZWxsVk1zLm1hcCgoY2VsbFZNKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gY2VsbFZNLmNlbGw7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBwb3N0T2ZmaWNlXzEuUG9zdE9mZmljZS5zZW5kTWVzc2FnZSh7IHR5cGU6IGNvbnN0YW50c18xLkhpc3RvcnlNZXNzYWdlcy5SZXR1cm5BbGxDZWxscywgcGF5bG9hZDogY2VsbHMgfSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLnJlbmRlckV4dHJhQnV0dG9ucyA9ICgpID0+IHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLnByb3BzLnNraXBEZWZhdWx0KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChjZWxsQnV0dG9uXzEuQ2VsbEJ1dHRvbiwgeyB0aGVtZTogdGhpcy5wcm9wcy50aGVtZSwgb25DbGljazogdGhpcy5hZGRNYXJrZG93biwgdG9vbHRpcDogJ0FkZCBNYXJrZG93biBUZXN0JyB9LCBcIk1cIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLnJlbmRlckNlbGxzID0gKCkgPT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zdGF0ZS5jZWxsVk1zLm1hcCgoY2VsbFZNLCBpbmRleCkgPT4gUmVhY3QuY3JlYXRlRWxlbWVudChlcnJvckJvdW5kYXJ5XzEuRXJyb3JCb3VuZGFyeSwgeyBrZXk6IGluZGV4IH0sXHJcbiAgICAgICAgICAgICAgICBSZWFjdC5jcmVhdGVFbGVtZW50KGNlbGxfMS5DZWxsLCB7IGNlbGxWTTogY2VsbFZNLCB0aGVtZTogdGhpcy5wcm9wcy50aGVtZSwgZ290b0NvZGU6ICgpID0+IHRoaXMuZ290b0NlbGxDb2RlKGluZGV4KSwgZGVsZXRlOiAoKSA9PiB0aGlzLmRlbGV0ZUNlbGwoaW5kZXgpIH0pKSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLmFkZE1hcmtkb3duID0gKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmFkZENlbGwoe1xyXG4gICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIGNlbGxfdHlwZTogJ21hcmtkb3duJyxcclxuICAgICAgICAgICAgICAgICAgICBtZXRhZGF0YToge30sXHJcbiAgICAgICAgICAgICAgICAgICAgc291cmNlOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICcjIyBDZWxsIDNcXG4nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAnSGVyZVxcJ3Mgc29tZSBtYXJrZG93blxcbicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICctIEEgTGlzdFxcbicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICctIE9mIEl0ZW1zJ1xyXG4gICAgICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBpZDogJzExMTEnLFxyXG4gICAgICAgICAgICAgICAgZmlsZTogJ2Zvby5weScsXHJcbiAgICAgICAgICAgICAgICBsaW5lOiAwLFxyXG4gICAgICAgICAgICAgICAgc3RhdGU6IHR5cGVzXzEuQ2VsbFN0YXRlLmZpbmlzaGVkXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5jb2xsYXBzZUFsbCA9ICgpID0+IHtcclxuICAgICAgICAgICAgcG9zdE9mZmljZV8xLlBvc3RPZmZpY2Uuc2VuZE1lc3NhZ2UoeyB0eXBlOiBjb25zdGFudHNfMS5IaXN0b3J5TWVzc2FnZXMuQ29sbGFwc2VBbGwsIHBheWxvYWQ6IHt9IH0pO1xyXG4gICAgICAgICAgICBjb25zdCBuZXdDZWxscyA9IHRoaXMuc3RhdGUuY2VsbFZNcy5tYXAoKHZhbHVlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUuaW5wdXRCbG9ja09wZW4pIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy50b2dnbGVDZWxsVk0odmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIHZhbHVlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIC8vIE5vdyBhc3NpZ24gb3VyIG5ldyBhcnJheSBjb3B5IHRvIHN0YXRlXHJcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoe1xyXG4gICAgICAgICAgICAgICAgY2VsbFZNczogbmV3Q2VsbHMsXHJcbiAgICAgICAgICAgICAgICBza2lwTmV4dFNjcm9sbDogdHJ1ZVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMuZXhwYW5kQWxsID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBwb3N0T2ZmaWNlXzEuUG9zdE9mZmljZS5zZW5kTWVzc2FnZSh7IHR5cGU6IGNvbnN0YW50c18xLkhpc3RvcnlNZXNzYWdlcy5FeHBhbmRBbGwsIHBheWxvYWQ6IHt9IH0pO1xyXG4gICAgICAgICAgICBjb25zdCBuZXdDZWxscyA9IHRoaXMuc3RhdGUuY2VsbFZNcy5tYXAoKHZhbHVlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXZhbHVlLmlucHV0QmxvY2tPcGVuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9nZ2xlQ2VsbFZNKHZhbHVlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCB2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAvLyBOb3cgYXNzaWduIG91ciBuZXcgYXJyYXkgY29weSB0byBzdGF0ZVxyXG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKHtcclxuICAgICAgICAgICAgICAgIGNlbGxWTXM6IG5ld0NlbGxzLFxyXG4gICAgICAgICAgICAgICAgc2tpcE5leHRTY3JvbGw6IHRydWVcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLmNhbkNvbGxhcHNlQWxsID0gKCkgPT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zdGF0ZS5jZWxsVk1zLmxlbmd0aCA+IDA7XHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLmNhbkV4cGFuZEFsbCA9ICgpID0+IHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3RhdGUuY2VsbFZNcy5sZW5ndGggPiAwO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5jYW5FeHBvcnQgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnN0YXRlLmNlbGxWTXMubGVuZ3RoID4gMDtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMuY2FuUmVkbyA9ICgpID0+IHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3RhdGUucmVkb1N0YWNrLmxlbmd0aCA+IDA7XHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLmNhblVuZG8gPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnN0YXRlLnVuZG9TdGFjay5sZW5ndGggPiAwO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5wdXNoU3RhY2sgPSAoc3RhY2ssIGNlbGxzKSA9PiB7XHJcbiAgICAgICAgICAgIC8vIEdldCB0aGUgdW5kbyBzdGFjayB1cCB0byB0aGUgbWF4aW11bSBsZW5ndGhcclxuICAgICAgICAgICAgY29uc3Qgc2xpY2VkVW5kbyA9IHN0YWNrLnNsaWNlKDAsIGxvZGFzaF8xLm1pbihbc3RhY2subGVuZ3RoLCB0aGlzLnN0YWNrTGltaXRdKSk7XHJcbiAgICAgICAgICAgIC8vIENvbWJpbmUgdGhpcyB3aXRoIG91ciBzZXQgb2YgY2VsbHNcclxuICAgICAgICAgICAgcmV0dXJuIFsuLi5zbGljZWRVbmRvLCBjZWxsc107XHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLmdvdG9DZWxsQ29kZSA9IChpbmRleCkgPT4ge1xyXG4gICAgICAgICAgICAvLyBGaW5kIG91ciBjZWxsXHJcbiAgICAgICAgICAgIGNvbnN0IGNlbGxWTSA9IHRoaXMuc3RhdGUuY2VsbFZNc1tpbmRleF07XHJcbiAgICAgICAgICAgIC8vIFNlbmQgYSBtZXNzYWdlIHRvIHRoZSBvdGhlciBzaWRlIHRvIGp1bXAgdG8gYSBwYXJ0aWN1bGFyIGNlbGxcclxuICAgICAgICAgICAgcG9zdE9mZmljZV8xLlBvc3RPZmZpY2Uuc2VuZE1lc3NhZ2UoeyB0eXBlOiBjb25zdGFudHNfMS5IaXN0b3J5TWVzc2FnZXMuR290b0NvZGVDZWxsLCBwYXlsb2FkOiB7IGZpbGU6IGNlbGxWTS5jZWxsLmZpbGUsIGxpbmU6IGNlbGxWTS5jZWxsLmxpbmUgfSB9KTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMuZGVsZXRlQ2VsbCA9IChpbmRleCkgPT4ge1xyXG4gICAgICAgICAgICBwb3N0T2ZmaWNlXzEuUG9zdE9mZmljZS5zZW5kTWVzc2FnZSh7IHR5cGU6IGNvbnN0YW50c18xLkhpc3RvcnlNZXNzYWdlcy5EZWxldGVDZWxsLCBwYXlsb2FkOiB7fSB9KTtcclxuICAgICAgICAgICAgLy8gVXBkYXRlIG91ciBzdGF0ZVxyXG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKHtcclxuICAgICAgICAgICAgICAgIGNlbGxWTXM6IHRoaXMuc3RhdGUuY2VsbFZNcy5maWx0ZXIoKGMsIGkpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaSAhPT0gaW5kZXg7XHJcbiAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgIHVuZG9TdGFjazogdGhpcy5wdXNoU3RhY2sodGhpcy5zdGF0ZS51bmRvU3RhY2ssIHRoaXMuc3RhdGUuY2VsbFZNcyksXHJcbiAgICAgICAgICAgICAgICBza2lwTmV4dFNjcm9sbDogdHJ1ZVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMuY2xlYXJBbGwgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIHBvc3RPZmZpY2VfMS5Qb3N0T2ZmaWNlLnNlbmRNZXNzYWdlKHsgdHlwZTogY29uc3RhbnRzXzEuSGlzdG9yeU1lc3NhZ2VzLkRlbGV0ZUFsbENlbGxzLCBwYXlsb2FkOiB7fSB9KTtcclxuICAgICAgICAgICAgLy8gVXBkYXRlIG91ciBzdGF0ZVxyXG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKHtcclxuICAgICAgICAgICAgICAgIGNlbGxWTXM6IFtdLFxyXG4gICAgICAgICAgICAgICAgdW5kb1N0YWNrOiB0aGlzLnB1c2hTdGFjayh0aGlzLnN0YXRlLnVuZG9TdGFjaywgdGhpcy5zdGF0ZS5jZWxsVk1zKSxcclxuICAgICAgICAgICAgICAgIHNraXBOZXh0U2Nyb2xsOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgYnVzeTogZmFsc2UgLy8gTm8gbW9yZSBwcm9ncmVzcyBvbiBkZWxldGUgYWxsXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5yZWRvID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAvLyBQb3Agb25lIG9mZiBvZiBvdXIgcmVkbyBzdGFjayBhbmQgdXBkYXRlIG91ciB1bmRvXHJcbiAgICAgICAgICAgIGNvbnN0IGNlbGxzID0gdGhpcy5zdGF0ZS5yZWRvU3RhY2tbdGhpcy5zdGF0ZS5yZWRvU3RhY2subGVuZ3RoIC0gMV07XHJcbiAgICAgICAgICAgIGNvbnN0IHJlZG9TdGFjayA9IHRoaXMuc3RhdGUucmVkb1N0YWNrLnNsaWNlKDAsIHRoaXMuc3RhdGUucmVkb1N0YWNrLmxlbmd0aCAtIDEpO1xyXG4gICAgICAgICAgICBjb25zdCB1bmRvU3RhY2sgPSB0aGlzLnB1c2hTdGFjayh0aGlzLnN0YXRlLnVuZG9TdGFjaywgdGhpcy5zdGF0ZS5jZWxsVk1zKTtcclxuICAgICAgICAgICAgcG9zdE9mZmljZV8xLlBvc3RPZmZpY2Uuc2VuZE1lc3NhZ2UoeyB0eXBlOiBjb25zdGFudHNfMS5IaXN0b3J5TWVzc2FnZXMuUmVkbywgcGF5bG9hZDoge30gfSk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoe1xyXG4gICAgICAgICAgICAgICAgY2VsbFZNczogY2VsbHMsXHJcbiAgICAgICAgICAgICAgICB1bmRvU3RhY2s6IHVuZG9TdGFjayxcclxuICAgICAgICAgICAgICAgIHJlZG9TdGFjazogcmVkb1N0YWNrLFxyXG4gICAgICAgICAgICAgICAgc2tpcE5leHRTY3JvbGw6IHRydWVcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLnVuZG8gPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIC8vIFBvcCBvbmUgb2ZmIG9mIG91ciB1bmRvIHN0YWNrIGFuZCB1cGRhdGUgb3VyIHJlZG9cclxuICAgICAgICAgICAgY29uc3QgY2VsbHMgPSB0aGlzLnN0YXRlLnVuZG9TdGFja1t0aGlzLnN0YXRlLnVuZG9TdGFjay5sZW5ndGggLSAxXTtcclxuICAgICAgICAgICAgY29uc3QgdW5kb1N0YWNrID0gdGhpcy5zdGF0ZS51bmRvU3RhY2suc2xpY2UoMCwgdGhpcy5zdGF0ZS51bmRvU3RhY2subGVuZ3RoIC0gMSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlZG9TdGFjayA9IHRoaXMucHVzaFN0YWNrKHRoaXMuc3RhdGUucmVkb1N0YWNrLCB0aGlzLnN0YXRlLmNlbGxWTXMpO1xyXG4gICAgICAgICAgICBwb3N0T2ZmaWNlXzEuUG9zdE9mZmljZS5zZW5kTWVzc2FnZSh7IHR5cGU6IGNvbnN0YW50c18xLkhpc3RvcnlNZXNzYWdlcy5VbmRvLCBwYXlsb2FkOiB7fSB9KTtcclxuICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZSh7XHJcbiAgICAgICAgICAgICAgICBjZWxsVk1zOiBjZWxscyxcclxuICAgICAgICAgICAgICAgIHVuZG9TdGFjazogdW5kb1N0YWNrLFxyXG4gICAgICAgICAgICAgICAgcmVkb1N0YWNrOiByZWRvU3RhY2ssXHJcbiAgICAgICAgICAgICAgICBza2lwTmV4dFNjcm9sbDogdHJ1ZVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMucmVzdGFydEtlcm5lbCA9ICgpID0+IHtcclxuICAgICAgICAgICAgLy8gU2VuZCBhIG1lc3NhZ2UgdG8gdGhlIG90aGVyIHNpZGUgdG8gcmVzdGFydCB0aGUga2VybmVsXHJcbiAgICAgICAgICAgIHBvc3RPZmZpY2VfMS5Qb3N0T2ZmaWNlLnNlbmRNZXNzYWdlKHsgdHlwZTogY29uc3RhbnRzXzEuSGlzdG9yeU1lc3NhZ2VzLlJlc3RhcnRLZXJuZWwsIHBheWxvYWQ6IHt9IH0pO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5leHBvcnQgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIC8vIFNlbmQgYSBtZXNzYWdlIHRvIHRoZSBvdGhlciBzaWRlIHRvIGV4cG9ydCBvdXIgY3VycmVudCBsaXN0XHJcbiAgICAgICAgICAgIGNvbnN0IGNlbGxDb250ZW50cyA9IHRoaXMuc3RhdGUuY2VsbFZNcy5tYXAoKGNlbGxWTSwgaW5kZXgpID0+IHsgcmV0dXJuIGNlbGxWTS5jZWxsOyB9KTtcclxuICAgICAgICAgICAgcG9zdE9mZmljZV8xLlBvc3RPZmZpY2Uuc2VuZE1lc3NhZ2UoeyB0eXBlOiBjb25zdGFudHNfMS5IaXN0b3J5TWVzc2FnZXMuRXhwb3J0LCBwYXlsb2FkOiB7IGNvbnRlbnRzOiBjZWxsQ29udGVudHMgfSB9KTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMuc2Nyb2xsVG9Cb3R0b20gPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmJvdHRvbSAmJiB0aGlzLmJvdHRvbS5zY3JvbGxJbnRvVmlldyAmJiAhdGhpcy5zdGF0ZS5za2lwTmV4dFNjcm9sbCkge1xyXG4gICAgICAgICAgICAgICAgLy8gRGVsYXkgdGhpcyB1bnRpbCB3ZSBhcmUgYWJvdXQgdG8gcmVuZGVyLiBSZWFjdCBoYXNuJ3Qgc2V0dXAgdGhlIHNpemUgb2YgdGhlIGJvdHRvbSBlbGVtZW50XHJcbiAgICAgICAgICAgICAgICAvLyB5ZXQgc28gd2UgbmVlZCB0byBkZWxheS4gMTBtcyBsb29rcyBnb29kIGZyb20gYSB1c2VyIHBvaW50IG9mIHZpZXdcclxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmJvdHRvbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJvdHRvbS5zY3JvbGxJbnRvVmlldyh7IGJlaGF2aW9yOiAnc21vb3RoJywgYmxvY2s6ICdlbmQnLCBpbmxpbmU6ICdlbmQnIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sIDEwMCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMudXBkYXRlQm90dG9tID0gKG5ld0JvdHRvbSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAobmV3Qm90dG9tICE9PSB0aGlzLmJvdHRvbSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ib3R0b20gPSBuZXdCb3R0b207XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcclxuICAgICAgICB0aGlzLmFkZENlbGwgPSAocGF5bG9hZCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocGF5bG9hZCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY2VsbCA9IHBheWxvYWQ7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjZWxsVk0gPSBtYWluUGFuZWxTdGF0ZV8xLmNyZWF0ZUNlbGxWTShjZWxsLCB0aGlzLmlucHV0QmxvY2tUb2dnbGVkKTtcclxuICAgICAgICAgICAgICAgIGlmIChjZWxsVk0pIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2VsbFZNczogWy4uLnRoaXMuc3RhdGUuY2VsbFZNcywgY2VsbFZNXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdW5kb1N0YWNrOiB0aGlzLnB1c2hTdGFjayh0aGlzLnN0YXRlLnVuZG9TdGFjaywgdGhpcy5zdGF0ZS5jZWxsVk1zKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVkb1N0YWNrOiB0aGlzLnN0YXRlLnJlZG9TdGFjayxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2tpcE5leHRTY3JvbGw6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMuaW5wdXRCbG9ja1RvZ2dsZWQgPSAoaWQpID0+IHtcclxuICAgICAgICAgICAgLy8gQ3JlYXRlIGEgc2hhbGxvdyBjb3B5IG9mIHRoZSBhcnJheSwgbGV0IG5vdCBjb25zdCBhcyB0aGlzIGlzIHRoZSBzaGFsbG93IGFycmF5IGNvcHkgdGhhdCB3ZSB3aWxsIGJlIGNoYW5naW5nXHJcbiAgICAgICAgICAgIGNvbnN0IGNlbGxWTUFycmF5ID0gWy4uLnRoaXMuc3RhdGUuY2VsbFZNc107XHJcbiAgICAgICAgICAgIGNvbnN0IGNlbGxWTUluZGV4ID0gY2VsbFZNQXJyYXkuZmluZEluZGV4KCh2YWx1ZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlLmNlbGwuaWQgPT09IGlkO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgaWYgKGNlbGxWTUluZGV4ID49IDApIHtcclxuICAgICAgICAgICAgICAgIC8vIENvbnN0IGhlcmUgYXMgdGhpcyBpcyB0aGUgc3RhdGUgb2JqZWN0IHB1bGxlZCBvZmYgb2Ygb3VyIHNoYWxsb3cgYXJyYXkgY29weSwgd2UgZG9uJ3Qgd2FudCB0byBtdXRhdGUgaXRcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldENlbGxWTSA9IGNlbGxWTUFycmF5W2NlbGxWTUluZGV4XTtcclxuICAgICAgICAgICAgICAgIC8vIE11dGF0ZSB0aGUgc2hhbGxvdyBhcnJheSBjb3B5XHJcbiAgICAgICAgICAgICAgICBjZWxsVk1BcnJheVtjZWxsVk1JbmRleF0gPSB0aGlzLnRvZ2dsZUNlbGxWTSh0YXJnZXRDZWxsVk0pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgc2tpcE5leHRTY3JvbGw6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgY2VsbFZNczogY2VsbFZNQXJyYXlcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvLyBUb2dnbGUgdGhlIGlucHV0IGNvbGxhcHNlIHN0YXRlIG9mIGEgY2VsbCB2aWV3IG1vZGVsIHJldHVybiBhIHNoYWxsb3cgY29weSB3aXRoIHVwZGF0ZWQgdmFsdWVzXHJcbiAgICAgICAgdGhpcy50b2dnbGVDZWxsVk0gPSAoY2VsbFZNKSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBuZXdDb2xsYXBzZVN0YXRlID0gY2VsbFZNLmlucHV0QmxvY2tPcGVuO1xyXG4gICAgICAgICAgICBsZXQgbmV3VGV4dCA9IGNlbGxWTS5pbnB1dEJsb2NrVGV4dDtcclxuICAgICAgICAgICAgaWYgKGNlbGxWTS5jZWxsLmRhdGEuY2VsbF90eXBlID09PSAnY29kZScpIHtcclxuICAgICAgICAgICAgICAgIG5ld0NvbGxhcHNlU3RhdGUgPSAhbmV3Q29sbGFwc2VTdGF0ZTtcclxuICAgICAgICAgICAgICAgIG5ld1RleHQgPSB0aGlzLmV4dHJhY3RJbnB1dFRleHQoY2VsbFZNLmNlbGwpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFuZXdDb2xsYXBzZVN0YXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5ld1RleHQubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdUZXh0ID0gbmV3VGV4dC5zcGxpdCgnXFxuJywgMSlbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1RleHQgPSBuZXdUZXh0LnNsaWNlKDAsIDI1NSk7IC8vIFNsaWNlIHRvIGxpbWl0IGxlbmd0aCBvZiBzdHJpbmcsIHNsaWNpbmcgcGFzdCB0aGUgc3RyaW5nIGxlbmd0aCBpcyBmaW5lXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1RleHQgPSBuZXdUZXh0LmNvbmNhdCgnLi4uJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBjZWxsVk0sIHsgaW5wdXRCbG9ja09wZW46IG5ld0NvbGxhcHNlU3RhdGUsIGlucHV0QmxvY2tUZXh0OiBuZXdUZXh0IH0pO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5leHRyYWN0SW5wdXRUZXh0ID0gKGNlbGwpID0+IHtcclxuICAgICAgICAgICAgcmV0dXJuIGNlbGxfMS5DZWxsLmNvbmNhdE11bHRpbGluZVN0cmluZyhjZWxsLmRhdGEuc291cmNlKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMudXBkYXRlT3JBZGQgPSAoY2VsbCwgYWxsb3dBZGQpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLnN0YXRlLmNlbGxWTXMuZmluZEluZGV4KChjKSA9PiBjLmNlbGwuaWQgPT09IGNlbGwuaWQpO1xyXG4gICAgICAgICAgICBpZiAoaW5kZXggPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoaXMgY2VsbFxyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZS5jZWxsVk1zW2luZGV4XS5jZWxsID0gY2VsbDtcclxuICAgICAgICAgICAgICAgIHRoaXMuZm9yY2VVcGRhdGUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChhbGxvd0FkZCkge1xyXG4gICAgICAgICAgICAgICAgLy8gVGhpcyBpcyBhbiBlbnRpcmVseSBuZXcgY2VsbCAoaXQgbWF5IGhhdmUgc3RhcnRlZCBvdXQgYXMgZmluaXNoZWQpXHJcbiAgICAgICAgICAgICAgICB0aGlzLmFkZENlbGwoY2VsbCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcclxuICAgICAgICB0aGlzLmZpbmlzaENlbGwgPSAocGF5bG9hZCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocGF5bG9hZCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY2VsbCA9IHBheWxvYWQ7XHJcbiAgICAgICAgICAgICAgICBpZiAoY2VsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlT3JBZGQoY2VsbCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcclxuICAgICAgICB0aGlzLnVwZGF0ZUNlbGwgPSAocGF5bG9hZCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocGF5bG9hZCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY2VsbCA9IHBheWxvYWQ7XHJcbiAgICAgICAgICAgICAgICBpZiAoY2VsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlT3JBZGQoY2VsbCwgZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvLyBEZWZhdWx0IHN0YXRlIHNob3VsZCBzaG93IGEgYnVzeSBtZXNzYWdlXHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHsgY2VsbFZNczogW10sIGJ1c3k6IHRydWUsIHVuZG9TdGFjazogW10sIHJlZG9TdGFjazogW10gfTtcclxuICAgICAgICBpZiAoIXRoaXMucHJvcHMuc2tpcERlZmF1bHQpIHtcclxuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IG1haW5QYW5lbFN0YXRlXzEuZ2VuZXJhdGVUZXN0U3RhdGUodGhpcy5pbnB1dEJsb2NrVG9nZ2xlZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29tcG9uZW50RGlkTW91bnQoKSB7XHJcbiAgICAgICAgdGhpcy5zY3JvbGxUb0JvdHRvbSgpO1xyXG4gICAgfVxyXG4gICAgY29tcG9uZW50RGlkVXBkYXRlKHByZXZQcm9wcywgcHJldlN0YXRlKSB7XHJcbiAgICAgICAgdGhpcy5zY3JvbGxUb0JvdHRvbSgpO1xyXG4gICAgfVxyXG4gICAgcmVuZGVyKCkge1xyXG4gICAgICAgIGNvbnN0IGNsZWFyQnV0dG9uSW1hZ2UgPSB0aGlzLnByb3BzLnRoZW1lICE9PSAndnNjb2RlLWRhcmsnID8gJy4vaW1hZ2VzL0NhbmNlbC9DYW5jZWxfMTZ4TURfdnNjb2RlLnN2ZycgOlxyXG4gICAgICAgICAgICAnLi9pbWFnZXMvQ2FuY2VsL0NhbmNlbF8xNnhNRF92c2NvZGVfZGFyay5zdmcnO1xyXG4gICAgICAgIGNvbnN0IHJlZG9JbWFnZSA9IHRoaXMucHJvcHMudGhlbWUgIT09ICd2c2NvZGUtZGFyaycgPyAnLi9pbWFnZXMvUmVkby9SZWRvXzE2eF92c2NvZGUuc3ZnJyA6XHJcbiAgICAgICAgICAgICcuL2ltYWdlcy9SZWRvL1JlZG9fMTZ4X3ZzY29kZV9kYXJrLnN2Zyc7XHJcbiAgICAgICAgY29uc3QgdW5kb0ltYWdlID0gdGhpcy5wcm9wcy50aGVtZSAhPT0gJ3ZzY29kZS1kYXJrJyA/ICcuL2ltYWdlcy9VbmRvL1VuZG9fMTZ4X3ZzY29kZS5zdmcnIDpcclxuICAgICAgICAgICAgJy4vaW1hZ2VzL1VuZG8vVW5kb18xNnhfdnNjb2RlX2Rhcmsuc3ZnJztcclxuICAgICAgICBjb25zdCByZXN0YXJ0SW1hZ2UgPSB0aGlzLnByb3BzLnRoZW1lICE9PSAndnNjb2RlLWRhcmsnID8gJy4vaW1hZ2VzL1Jlc3RhcnQvUmVzdGFydF9ncmV5XzE2eF92c2NvZGUuc3ZnJyA6XHJcbiAgICAgICAgICAgICcuL2ltYWdlcy9SZXN0YXJ0L1Jlc3RhcnRfZ3JleV8xNnhfdnNjb2RlX2Rhcmsuc3ZnJztcclxuICAgICAgICBjb25zdCBzYXZlQXNJbWFnZSA9IHRoaXMucHJvcHMudGhlbWUgIT09ICd2c2NvZGUtZGFyaycgPyAnLi9pbWFnZXMvU2F2ZUFzL1NhdmVBc18xNnhfdnNjb2RlLnN2ZycgOlxyXG4gICAgICAgICAgICAnLi9pbWFnZXMvU2F2ZUFzL1NhdmVBc18xNnhfdnNjb2RlX2Rhcmsuc3ZnJztcclxuICAgICAgICBjb25zdCBjb2xsYXBzZUFsbEltYWdlID0gdGhpcy5wcm9wcy50aGVtZSAhPT0gJ3ZzY29kZS1kYXJrJyA/ICcuL2ltYWdlcy9Db2xsYXBzZUFsbC9Db2xsYXBzZUFsbF8xNnhfdnNjb2RlLnN2ZycgOlxyXG4gICAgICAgICAgICAnLi9pbWFnZXMvQ29sbGFwc2VBbGwvQ29sbGFwc2VBbGxfMTZ4X3ZzY29kZV9kYXJrLnN2Zyc7XHJcbiAgICAgICAgY29uc3QgZXhwYW5kQWxsSW1hZ2UgPSB0aGlzLnByb3BzLnRoZW1lICE9PSAndnNjb2RlLWRhcmsnID8gJy4vaW1hZ2VzL0V4cGFuZEFsbC9FeHBhbmRBbGxfMTZ4X3ZzY29kZS5zdmcnIDpcclxuICAgICAgICAgICAgJy4vaW1hZ2VzL0V4cGFuZEFsbC9FeHBhbmRBbGxfMTZ4X3ZzY29kZV9kYXJrLnN2Zyc7XHJcbiAgICAgICAgY29uc3QgcHJvZ3Jlc3NCYXIgPSB0aGlzLnN0YXRlLmJ1c3kgJiYgIXRoaXMucHJvcHMuaWdub3JlUHJvZ3Jlc3MgPyBSZWFjdC5jcmVhdGVFbGVtZW50KHByb2dyZXNzXzEuUHJvZ3Jlc3MsIG51bGwpIDogdW5kZWZpbmVkO1xyXG4gICAgICAgIHJldHVybiAoUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7IGNsYXNzTmFtZTogJ21haW4tcGFuZWwnIH0sXHJcbiAgICAgICAgICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQocG9zdE9mZmljZV8xLlBvc3RPZmZpY2UsIHsgbWVzc2FnZUhhbmRsZXJzOiBbdGhpc10gfSksXHJcbiAgICAgICAgICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQobWVudUJhcl8xLk1lbnVCYXIsIHsgdGhlbWU6IHRoaXMucHJvcHMudGhlbWUsIHN0eWxlUG9zaXRpb246ICd0b3AtZml4ZWQnIH0sXHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckV4dHJhQnV0dG9ucygpLFxyXG4gICAgICAgICAgICAgICAgUmVhY3QuY3JlYXRlRWxlbWVudChjZWxsQnV0dG9uXzEuQ2VsbEJ1dHRvbiwgeyB0aGVtZTogdGhpcy5wcm9wcy50aGVtZSwgb25DbGljazogdGhpcy5jb2xsYXBzZUFsbCwgZGlzYWJsZWQ6ICF0aGlzLmNhbkNvbGxhcHNlQWxsKCksIHRvb2x0aXA6IGxvY1JlYWN0U2lkZV8xLmdldExvY1N0cmluZygnRGF0YVNjaWVuY2UuY29sbGFwc2VBbGwnLCAnQ29sbGFwc2UgYWxsIGNlbGwgaW5wdXRzJykgfSxcclxuICAgICAgICAgICAgICAgICAgICBSZWFjdC5jcmVhdGVFbGVtZW50KHJlbGF0aXZlSW1hZ2VfMS5SZWxhdGl2ZUltYWdlLCB7IGNsYXNzOiAnY2VsbC1idXR0b24taW1hZ2UnLCBwYXRoOiBjb2xsYXBzZUFsbEltYWdlIH0pKSxcclxuICAgICAgICAgICAgICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQoY2VsbEJ1dHRvbl8xLkNlbGxCdXR0b24sIHsgdGhlbWU6IHRoaXMucHJvcHMudGhlbWUsIG9uQ2xpY2s6IHRoaXMuZXhwYW5kQWxsLCBkaXNhYmxlZDogIXRoaXMuY2FuRXhwYW5kQWxsKCksIHRvb2x0aXA6IGxvY1JlYWN0U2lkZV8xLmdldExvY1N0cmluZygnRGF0YVNjaWVuY2UuZXhwYW5kQWxsJywgJ0V4cGFuZCBhbGwgY2VsbCBpbnB1dHMnKSB9LFxyXG4gICAgICAgICAgICAgICAgICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQocmVsYXRpdmVJbWFnZV8xLlJlbGF0aXZlSW1hZ2UsIHsgY2xhc3M6ICdjZWxsLWJ1dHRvbi1pbWFnZScsIHBhdGg6IGV4cGFuZEFsbEltYWdlIH0pKSxcclxuICAgICAgICAgICAgICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQoY2VsbEJ1dHRvbl8xLkNlbGxCdXR0b24sIHsgdGhlbWU6IHRoaXMucHJvcHMudGhlbWUsIG9uQ2xpY2s6IHRoaXMuZXhwb3J0LCBkaXNhYmxlZDogIXRoaXMuY2FuRXhwb3J0KCksIHRvb2x0aXA6IGxvY1JlYWN0U2lkZV8xLmdldExvY1N0cmluZygnRGF0YVNjaWVuY2UuZXhwb3J0JywgJ0V4cG9ydCBhcyBKdXB5dGVyIE5vdGVib29rJykgfSxcclxuICAgICAgICAgICAgICAgICAgICBSZWFjdC5jcmVhdGVFbGVtZW50KHJlbGF0aXZlSW1hZ2VfMS5SZWxhdGl2ZUltYWdlLCB7IGNsYXNzOiAnY2VsbC1idXR0b24taW1hZ2UnLCBwYXRoOiBzYXZlQXNJbWFnZSB9KSksXHJcbiAgICAgICAgICAgICAgICBSZWFjdC5jcmVhdGVFbGVtZW50KGNlbGxCdXR0b25fMS5DZWxsQnV0dG9uLCB7IHRoZW1lOiB0aGlzLnByb3BzLnRoZW1lLCBvbkNsaWNrOiB0aGlzLnJlc3RhcnRLZXJuZWwsIHRvb2x0aXA6IGxvY1JlYWN0U2lkZV8xLmdldExvY1N0cmluZygnRGF0YVNjaWVuY2UucmVzdGFydFNlcnZlcicsICdSZXN0YXJ0IGlQeXRob24gS2VybmVsJykgfSxcclxuICAgICAgICAgICAgICAgICAgICBSZWFjdC5jcmVhdGVFbGVtZW50KHJlbGF0aXZlSW1hZ2VfMS5SZWxhdGl2ZUltYWdlLCB7IGNsYXNzOiAnY2VsbC1idXR0b24taW1hZ2UnLCBwYXRoOiByZXN0YXJ0SW1hZ2UgfSkpLFxyXG4gICAgICAgICAgICAgICAgUmVhY3QuY3JlYXRlRWxlbWVudChjZWxsQnV0dG9uXzEuQ2VsbEJ1dHRvbiwgeyB0aGVtZTogdGhpcy5wcm9wcy50aGVtZSwgb25DbGljazogdGhpcy51bmRvLCBkaXNhYmxlZDogIXRoaXMuY2FuVW5kbygpLCB0b29sdGlwOiBsb2NSZWFjdFNpZGVfMS5nZXRMb2NTdHJpbmcoJ0RhdGFTY2llbmNlLnVuZG8nLCAnVW5kbycpIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgUmVhY3QuY3JlYXRlRWxlbWVudChyZWxhdGl2ZUltYWdlXzEuUmVsYXRpdmVJbWFnZSwgeyBjbGFzczogJ2NlbGwtYnV0dG9uLWltYWdlJywgcGF0aDogdW5kb0ltYWdlIH0pKSxcclxuICAgICAgICAgICAgICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQoY2VsbEJ1dHRvbl8xLkNlbGxCdXR0b24sIHsgdGhlbWU6IHRoaXMucHJvcHMudGhlbWUsIG9uQ2xpY2s6IHRoaXMucmVkbywgZGlzYWJsZWQ6ICF0aGlzLmNhblJlZG8oKSwgdG9vbHRpcDogbG9jUmVhY3RTaWRlXzEuZ2V0TG9jU3RyaW5nKCdEYXRhU2NpZW5jZS5yZWRvJywgJ1JlZG8nKSB9LFxyXG4gICAgICAgICAgICAgICAgICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQocmVsYXRpdmVJbWFnZV8xLlJlbGF0aXZlSW1hZ2UsIHsgY2xhc3M6ICdjZWxsLWJ1dHRvbi1pbWFnZScsIHBhdGg6IHJlZG9JbWFnZSB9KSksXHJcbiAgICAgICAgICAgICAgICBSZWFjdC5jcmVhdGVFbGVtZW50KGNlbGxCdXR0b25fMS5DZWxsQnV0dG9uLCB7IHRoZW1lOiB0aGlzLnByb3BzLnRoZW1lLCBvbkNsaWNrOiB0aGlzLmNsZWFyQWxsLCB0b29sdGlwOiBsb2NSZWFjdFNpZGVfMS5nZXRMb2NTdHJpbmcoJ0RhdGFTY2llbmNlLmNsZWFyQWxsJywgJ1JlbW92ZSBBbGwgQ2VsbHMnKSB9LFxyXG4gICAgICAgICAgICAgICAgICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQocmVsYXRpdmVJbWFnZV8xLlJlbGF0aXZlSW1hZ2UsIHsgY2xhc3M6ICdjZWxsLWJ1dHRvbi1pbWFnZScsIHBhdGg6IGNsZWFyQnV0dG9uSW1hZ2UgfSkpKSxcclxuICAgICAgICAgICAgUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7IGNsYXNzTmFtZTogJ3RvcC1zcGFjaW5nJyB9KSxcclxuICAgICAgICAgICAgcHJvZ3Jlc3NCYXIsXHJcbiAgICAgICAgICAgIHRoaXMucmVuZGVyQ2VsbHMoKSxcclxuICAgICAgICAgICAgUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7IHJlZjogdGhpcy51cGRhdGVCb3R0b20gfSkpKTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLk1haW5QYW5lbCA9IE1haW5QYW5lbDtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9TWFpblBhbmVsLmpzLm1hcCJdfQ==