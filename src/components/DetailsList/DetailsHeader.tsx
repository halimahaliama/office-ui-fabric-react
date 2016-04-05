import * as React from 'react';
import { IColumn, DetailsListLayoutMode } from './interfaces';
import { css } from '../../utilities/css';
import { FocusZone, FocusZoneDirection } from '../../utilities/focus/index';
import { ISelection, SelectionMode, SELECTION_CHANGE } from '../../utilities/selection/ISelection';
import Check from './Check';
import { getRTL } from '../../utilities/rtl';
import EventGroup from '../../utilities/eventGroup/EventGroup';
import './DetailsHeader.scss';

const MOUSEDOWN_PRIMARY_BUTTON = 0; // for mouse down event we are using ev.button property, 0 means left button
const MOUSEMOVE_PRIMARY_BUTTON = 1; // for mouse move event we are using ev.buttons property, 1 means left button

export interface IDetailsHeaderProps {
  columns: IColumn[];
  selection: ISelection;
  selectionMode: SelectionMode;
  layoutMode: DetailsListLayoutMode;
  onColumnIsSizingChanged?: (column: IColumn, isSizing: boolean) => void;
  onColumnResized?: (column: IColumn, newWidth: number) => void;
  onColumnAutoResized?: (column: IColumn, columnIndex: number) => void;
  isGrouped?: boolean;
  isAllCollapsed?: boolean;
  onToggleCollapseAll?: (isAllCollapsed: boolean) => void;

  ref?: string;
}

export interface IDetailsHeaderState {
  columnResizeDetails?: IColumnResizeDetails;
  isAllSelected?: boolean;
  isSizing?: boolean;
  isGrouped?: boolean;
  isAllCollapsed?: boolean;
}

export interface IColumnResizeDetails {
  columnIndex: number;
  originX: number;
  columnMinWidth: number;
}

export default class DetailsHeader extends React.Component<IDetailsHeaderProps, IDetailsHeaderState> {
  private _events: EventGroup;

  constructor(props: IDetailsHeaderProps) {
    super(props);

    this._events = new EventGroup(this);

    this.state = {
      columnResizeDetails: null,
      isGrouped: this.props.isGrouped,
      isAllCollapsed: this.props.isAllCollapsed
    };

    this._onSizerMove = this._onSizerMove.bind(this);
    this._onSizerUp = this._onSizerUp.bind(this);
    this._onToggleCollapseAll = this._onToggleCollapseAll.bind(this);
    this._onSelectAllClicked = this._onSelectAllClicked.bind(this);
  }

  public componentDidMount() {
    let { selection } = this.props;

    this._events.on(selection, SELECTION_CHANGE, this._onSelectionChanged);
  }

  public componentWillUnmount() {
    this._events.dispose();
  }

  public componentWillReceiveProps(newProps) {
    let { isGrouped } = this.state;

    if (newProps.isGrouped !== isGrouped) {
      this.setState({ isGrouped: newProps.isGrouped });
    }
  }

  public render() {
    let { selectionMode, columns } = this.props;
    let { isAllSelected, columnResizeDetails, isSizing, isGrouped, isAllCollapsed } = this.state;

    return (
      <div
        className={ css('ms-DetailsHeader ms-font-s', {
          'is-allSelected': isAllSelected,
          'is-singleSelect': selectionMode === SelectionMode.single,
          'is-resizingColumn': !!columnResizeDetails && isSizing
        }) }
        onMouseMove={ this._onMove.bind(this) }
        onMouseUp={ this._onUp.bind(this) }
        ref='root'>
        <FocusZone direction={ FocusZoneDirection.horizontal }>
          { (selectionMode === SelectionMode.multiple) ? (
            <button
              className='ms-DetailsHeader-cell is-check'
              onClick={ this._onSelectAllClicked }
              >
              <Check isChecked={ isAllSelected } />
            </button>
          ) : (null) }
          { isGrouped ? (
          <span className='ms-DetailsHeader-cell'>
            <i className={ css('ms-DetailsHeader-collapseButton ms-Icon ms-Icon--chevronDown', {
              'is-collapsed': isAllCollapsed
            }) } onClick={ this._onToggleCollapseAll }>
            </i>
          </span>
          ) : (null) }
          { columns.map((column, columnIndex) => (
            <div key={ column.key } className='ms-DetailsHeader-cellSizeWrapper'>
              <div className='ms-DetailsHeader-cellWrapper'>
                <button
                  key={ column.fieldName }
                  disabled={ !column.isSortable && !column.isGroupable && !column.isFilterable }
                  className={ css('ms-DetailsHeader-cell', {
                    'is-actionable': column.isSortable || column.isGroupable || column.isFilterable,
                    'is-sorted': column.isSorted,
                    'is-grouped': column.isGrouped
                  }) }
                  style={ { width: column.calculatedWidth } }
                  onClick={ this._onColumnClick.bind(this, column) }
                  >
                  <span
                    className={ css('ms-DetailsHeader-sortArrow ms-Icon', {
                      'ms-Icon--arrowUp2': !column.isGrouped && !column.isSortedDescending,
                      'ms-Icon--arrowDown2': !column.isGrouped && column.isSortedDescending,
                      'ms-Icon--listGroup2': column.isGrouped
                    }) }
                    />
                  { column.name }
                  { column.isFilterable ? (
                    <i className='ms-DetailsHeader-filterChevron ms-Icon ms-Icon--chevronDown' />
                  ) : (null) }
                </button>
              </div>
              { (column.isResizable) ? (
                <div
                  className={ css('ms-DetailsHeader-cell is-sizer', {
                    'is-resizing': columnResizeDetails && columnResizeDetails.columnIndex === columnIndex && isSizing
                  }) }
                  onMouseDown={ this._onSizerDown.bind(this, columnIndex) }
                  onDoubleClick={ this._onSizerDoubleClick.bind(this, columnIndex) }
                  />
              ) : (null) }
            </div>
          )) }
        </FocusZone>
        <div className='ms-DetailsHeader-sizerCover' onMouseMove={ this._onSizerMove } onMouseUp={ this._onSizerUp } />
      </div>
    );
  }

  /**
   * double click on the column sizer will auto ajust column width
   * to fit the longest content among current rendered rows.
   *
   * @private
   * @param {number} columnIndex (index of the column user double clicked)
   * @param {React.MouseEvent} ev (mouse double click event)
   */
  private _onSizerDoubleClick(columnIndex: number, ev: React.MouseEvent) {
    let { onColumnAutoResized, columns } = this.props;
    if (onColumnAutoResized) {
      onColumnAutoResized(columns[columnIndex], columnIndex);
    }
  }

  /**
   * Called when the select all toggle is clicked.
   */
  private _onSelectAllClicked() {
    let { selection } = this.props;

    selection.toggleAllSelected();
  }

  /**
   * mouse move event handler in the header
   * it will set isSizing state to true when user clicked on the sizer and move the mouse.
   *
   * @private
   * @param {React.MouseEvent} ev (mouse move event)
   */
  private _onMove(ev: React.MouseEvent) {
    let {
      // use buttons property here since ev.button in some edge case is not upding well during the move.
      // but firefox doesn't support it, so we set the default value when it is not defined.
      buttons = MOUSEMOVE_PRIMARY_BUTTON
    } = ev;

    let { columnResizeDetails, isSizing } = this.state;

    if (columnResizeDetails) {
      if (buttons !== MOUSEMOVE_PRIMARY_BUTTON) {
        // cancel mouse down event and return early when the primary button is not pressed
        this._onUp(ev);
        return;
      }

      if (!isSizing && ev.clientX !== columnResizeDetails.originX) {
        isSizing = true;
        this.setState({ isSizing: isSizing });
      }
    }
  }

  /**
   * mouse up event handler in the header
   * clear the resize related state.
   * This is to ensure we can catch double click event
   *
   * @private
   * @param {React.MouseEvent} ev (mouse up event)
   */
  private _onUp(ev: React.MouseEvent) {
    this.setState({
      columnResizeDetails: null,
      isSizing: false
    });
  }

  private _onSizerDown(columnIndex: number, ev: React.MouseEvent) {
    if (ev.button !== MOUSEDOWN_PRIMARY_BUTTON) {
      // Ignore anything except the primary button.
      return;
    }

    let { columns, onColumnIsSizingChanged } = this.props;

    this.setState({
      columnResizeDetails: {
        columnIndex: columnIndex,
        columnMinWidth: columns[columnIndex].calculatedWidth,
        originX: ev.clientX
      }
    });

    if (onColumnIsSizingChanged) {
      onColumnIsSizingChanged(columns[columnIndex], true);
    }
  }

  private _onSelectionChanged() {
    let isAllSelected = this.props.selection.isAllSelected();

    if (this.state.isAllSelected !== isAllSelected) {
      this.setState({
        isAllSelected: isAllSelected
      });
    }
  }

  private _onSizerMove(ev: React.MouseEvent) {
    let {
      // use buttons property here since ev.button in some edge case is not upding well during the move.
      // but firefox doesn't support it, so we set the default value when it is not defined.
      buttons = MOUSEMOVE_PRIMARY_BUTTON
    } = ev;

    let { columnResizeDetails } = this.state;

    if (columnResizeDetails) {
      if (buttons !== MOUSEMOVE_PRIMARY_BUTTON) {
        // cancel mouse down event and return early when the primary button is not pressed
        this._onSizerUp();
        return;
      }

      let { onColumnResized, columns } = this.props;

      if (onColumnResized) {
        let movement = ev.clientX - columnResizeDetails.originX;

        if (getRTL()) {
          movement = -movement;
        }

        onColumnResized(
          columns[columnResizeDetails.columnIndex],
          columnResizeDetails.columnMinWidth + movement
        );
      }
    }
  }

  private _onSizerUp() {
    let { columns, onColumnIsSizingChanged } = this.props;
    let { columnResizeDetails } = this.state;

    this.setState({
      columnResizeDetails: null,
      isSizing: false
    });

    if (onColumnIsSizingChanged) {
      onColumnIsSizingChanged(columns[columnResizeDetails.columnIndex], false);
    }
  }

  private _onColumnClick(column, ev) {
    if (column.onColumnClick) {
      column.onColumnClick(column, ev);
    }
  }

  private _onToggleCollapseAll() {
    let { onToggleCollapseAll } = this.props;
    let newCollapsed = !this.state.isAllCollapsed;
    this.setState({
      isAllCollapsed: newCollapsed
    });
    if (onToggleCollapseAll) {
      onToggleCollapseAll(newCollapsed);
    }
  }

}
