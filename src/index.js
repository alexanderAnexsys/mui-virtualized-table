import React, { Component } from 'react';
import PropTypes from 'prop-types';
import MultiGrid from 'react-virtualized/dist/commonjs/MultiGrid';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableFooter from '@material-ui/core/TableFooter';
import TablePagination from '@material-ui/core/TablePagination';
import TableSortLabel from '@material-ui/core/TableSortLabel';
import Draggable from 'react-draggable';
import defaultCellRangeRenderer from './defaultCellRangeRenderer';

import { calcColumnWidth } from './utils';

const FOOTER_BORDER_HEIGHT = 1;

function cellRangeRenderer(props) {
  const children = defaultCellRangeRenderer(props);
  return children;
}

export const styles = theme => ({
  table: {
    boxSizing: 'border-box',
    border: `1px solid ${theme.palette.text.lightDivider}`,

    '& .topLeftGrid': {
      backgroundColor: theme.palette.grey['200'],
      borderBottom: `2px solid ${theme.palette.divider}`,
      borderRight: `2px solid ${theme.palette.divider}`,
      color: theme.palette.text.secondary,
      fontSize: theme.typography.pxToRem(12),

      // Hide scrollbars on Chrome/Safari/IE
      '&::-webkit-scrollbar': {
        display: 'none'
      },
      '-ms-overflow-style': 'none'
    },

    '& .topRightGrid': {
      backgroundColor: theme.palette.grey['200'],
      borderBottom: `2px solid ${theme.palette.divider}`,
      color: theme.palette.text.secondary,
      fontSize: theme.typography.pxToRem(12),

      // Hide scrollbars on Chrome/Safari/IE
      '&::-webkit-scrollbar': {
        display: 'none'
      },
      '-ms-overflow-style': 'none'
    },

    '& .bottomLeftGrid': {
      backgroundColor: theme.palette.grey['200'],
      borderRight: `2px solid ${theme.palette.divider}`,
      color: theme.palette.text.secondary,
      fontSize: theme.typography.pxToRem(13),

      // Hide scrollbars on Chrome/Safari/IE
      '&::-webkit-scrollbar': {
        display: 'none'
      },
      '-ms-overflow-style': 'none'
    },

    '& .bottomRightGrid': {
      color: theme.palette.text.primary,
      fontSize: theme.typography.pxToRem(13),
      outline: 'none' // See: https://github.com/bvaughn/react-virtualized/issues/381
    }
  },
  cell: {
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    // borderRight: `1px solid ${theme.palette.text.lightDivider}`,
    paddingLeft: '16px',
    paddingRight: '16px'
  },
  cellSelected: {
    backgroundColor: theme.palette.grey[100]
  },
  cellHovered: {
    backgroundColor: theme.palette.grey[200]
  },
  cellContents: {
    width: '100%',
    height: '100%',
    paddingTop: '10px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  cellHeader: {
    fontSize: theme.typography.pxToRem(12),
    fontWeight: theme.typography.fontWeightMedium,
    color: theme.palette.text.secondary
  },
  cellInLastColumn: {
    paddingRight: theme.spacing.unit * 3
  },
  cellInLastRow: {
    borderBottom: 'none'
  },
  footer: {
    borderTop: `${FOOTER_BORDER_HEIGHT}px solid ${theme.palette.divider}`
  },
  dragHandle: {
    flex: '0 0 16px',
    zIndex: 2,
    cursor: 'col-resize',
    color: '#0085ff'
  },
  DragHandleActive: {
    color: '#0b6fcc',
    zIndex: 3
  },
  DragHandleIcon: {
    flex: '0 0 12px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  }
});

class MuiTable extends Component {
  static propTypes = {
    width: PropTypes.number.isRequired
  };

  static defaultProps = {
    rowHeight: 48,
    maxHeight: null,
    includeHeaders: false,
    fixedRowCount: 0,
    fixedColumnCount: 0
  };

  constructor(props) {
    super(props);
    var widths = {};
    if (props.resizable) {
      var initialWidth = 1;
      var columns = [];
      props.columns.forEach(c => {
        if (c.width) {
          widths[c.name] = 0.1;
          initialWidth = initialWidth - 0.1;
        } else {
          columns.push(c);
        }
      });
      columns.forEach(c => {
        widths[c.name] = initialWidth / columns.length;
      });
    }
    this.state = {
      hoveredColumn: null,
      hoveredRowData: null,
      widths
    };
    this.rowHeight = this.rowHeight.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    if (
      nextProps.width !== this.props.width ||
      nextProps.columns !== this.props.columns
    ) {
      this.multiGrid.recomputeGridSize();
    }
  }

  resizeRow = ({ dataKey, deltaX }) =>
    this.setState(
      prevState => {
        const prevWidths = prevState.widths;
        const percentDelta = deltaX / this.props.width;
        const columns = this.props.columns;
        const index = columns.findIndex(c => c.name === dataKey);
        const nextDataKey = columns[index + 1].name;
        return {
          widths: {
            ...prevWidths,
            [dataKey]: prevWidths[dataKey] + percentDelta,
            [nextDataKey]: prevWidths[nextDataKey] - percentDelta
          }
        };
      },
      () => {
        this.multiGrid.recomputeGridSize();
      }
    );

  cellRenderer = ({ columnIndex, rowIndex, key, style }) => {
    const {
      data,
      columns,
      includeHeaders,
      isCellHovered,
      isCellSelected,
      classes,
      orderBy,
      orderDirection,
      onHeaderClick,
      onCellClick,
      resizable,
      expandedRow,
      cellProps: defaultCellProps
    } = this.props;

    const { hoveredColumn, hoveredRowData } = this.state;

    const column = columns[columnIndex];
    const isHeader = includeHeaders && rowIndex === 0;
    const headerOffset = includeHeaders ? 1 : 0;
    const rowData = (data && data[rowIndex]) || {};

    const isSelected = isCellSelected && isCellSelected(column, rowData);

    const isHovered =
      hoveredColumn &&
      hoveredRowData &&
      isCellHovered &&
      isCellHovered(column, rowData, hoveredColumn, hoveredRowData);

    const resolveCellProps = cellProps =>
      typeof cellProps === 'function'
        ? cellProps(column, rowData, hoveredColumn, hoveredRowData)
        : cellProps;
    // TODO: Deep merge (do not override all defaultCellProps styles if column.cellProps.styles defined?)
    const { style: cellStyle, ...cellProps } = {
      ...resolveCellProps(defaultCellProps),
      ...resolveCellProps(column.cellProps)
    };

    const contents = (
      <div className={classes.cellContents}>
        <span style={{ flex: 'auto' }}>
          {isHeader
            ? column.header != null
              ? column.header
              : column.name
            : column.cell
              ? column.cell(rowData)
              : rowData[column.name]}
        </span>
        <span style={{ float: 'right' }}>
          {isHeader &&
            resizable &&
            columnIndex < columns.length - 1 && (
              <Draggable
                axis="x"
                defaultClassName={classes.dragHandle}
                defaultClassNameDragging={classes.DragHandleActive}
                onDrag={(event, { deltaX }) =>
                  this.resizeRow({
                    dataKey: column.name,
                    deltaX
                  })
                }
                position={{ x: 0 }}
                zIndex={999}
              >
                <span className={classes.DragHandleIcon}>⋮</span>
              </Draggable>
            )}
        </span>
      </div>
    );

    const className = classNames(classes.cell, {
      [classes.cellHovered]: isHovered,
      [classes.cellSelected]: isSelected,
      [classes.cellHeader]: isHeader,
      [classes.cellInLastColumn]: columnIndex === columns.length - 1,
      [classes.cellInLastRow]: rowIndex === (data ? data.length : 0)
    });

    const hasCellClick = !isHeader && onCellClick;
    const hasCellExpandClick = !isHeader && expandedRow;

    return (
      <TableCell
        component="div"
        className={className}
        key={key}
        onMouseEnter={() => {
          this.setState({ hoveredColumn: column, hoveredRowData: rowData });
        }}
        onMouseLeave={() =>
          this.setState({ hoveredColumn: null, hoveredRowData: null })
        }
        style={{
          ...style,
          ...cellStyle,
          ...((hasCellClick || column.onClick) && { cursor: 'pointer' })
        }}
        {...hasCellExpandClick && {
          onClick: event => {
            event.stopPropagation();
            rowData.expanded = !rowData.expanded;
            this.multiGrid.recomputeGridSize(0, rowIndex);
            // List.recomputeRowHeights();
            // List.forceUpdate();
          }
        }} // Can be overridden by cellProps.onClick on column definition
        {...hasCellClick && {
          onClick: () => onCellClick(column, rowData)
        }} // Can be overridden by cellProps.onClick on column definition
        {...cellProps}
      >
        {isHeader &&
        column.onHeaderClick !== false &&
        (column.onHeaderClick || onHeaderClick) ? (
          <TableSortLabel
            active={
              orderBy &&
              (orderBy === column.name || orderBy === column.orderBy) &&
              rowIndex === 0
            }
            style={{ width: 'inherit' }} // fix text overflowing
            direction={orderDirection}
            onClick={() =>
              column.onHeaderClick
                ? column.onHeaderClick()
                : onHeaderClick(column)
            }
          >
            {contents}
          </TableSortLabel>
        ) : isHeader && column.resizable ? (
          <React.Fragment>
            {contents}

            <Draggable
              axis="x"
              defaultClassName="DragHandle"
              defaultClassNameDragging="DragHandleActive"
              onDrag={(event, { deltaX }) =>
                this.resizeRow({
                  dataKey,
                  deltaX
                })
              }
              position={{ x: 0 }}
              zIndex={999}
            >
              <span className="DragHandleIcon">⋮</span>
            </Draggable>
          </React.Fragment>
        ) : (
          contents
        )}
      </TableCell>
    );
  };

  resizableColumnWidths(index, columns, tableWidth) {
    const column = columns[index];
    return this.state.widths[column.name] * this.props.width;
  }

  rowHeight(params) {
    const { data } = this.props;
    const item = data[params.index];
    if (item.expanded) {
      return 200;
    } else {
      return 48;
    }
  }

  render() {
    const {
      data,
      columns,
      width,
      height,
      maxHeight,
      pagination,
      fitHeightToRows,
      fixedRowCount,
      fixedColumnCount,
      rowHeight,
      columnWidth,
      includeHeaders,
      classes,
      orderBy,
      orderDirection,
      onHeaderClick,
      onCellClick,
      isCellHovered,
      isCellSelected,
      cellProps,
      style,
      theme,
      resizable,
      expandedRow,
      ...props
    } = this.props;

    let calculatedHeight = 0;
    if (height) {
      calculatedHeight = height; // fixed height
    } else if (pagination && pagination.rowsPerPage && !fitHeightToRows) {
      const rowCount =
        pagination.rowsPerPage +
        (fixedRowCount ? fixedRowCount : includeHeaders ? 1 : 0);
      calculatedHeight = rowCount * rowHeight;
    } else if (Array.isArray(data)) {
      const rowCount =
        data.length + (fixedRowCount ? fixedRowCount : includeHeaders ? 1 : 0);
      calculatedHeight = rowCount * rowHeight;
    }

    const paginationHeight =
      theme.mixins.toolbar.minHeight + FOOTER_BORDER_HEIGHT;

    const calculatedHeightWithFooter =
      calculatedHeight + (pagination ? paginationHeight : 0);
    const containerHeight =
      maxHeight != null
        ? Math.min(calculatedHeightWithFooter, maxHeight)
        : calculatedHeightWithFooter;
    const multiGridHeight =
      containerHeight - (pagination ? paginationHeight : 0);

    return (
      <Table
        component="div"
        style={{ width, height: containerHeight, ...style }}
        className={classes.table}
        {...props}
      >
        <MultiGrid
          cellRangeRenderer={props =>
            cellRangeRenderer({ ...props, data, expandedRow })
          }
          cellRenderer={props => this.cellRenderer({ ...props, expandedRow })}
          ref={el => (this.multiGrid = el)}
          width={width}
          columnWidth={
            columnWidth || resizable
              ? ({ index }) => this.resizableColumnWidths(index, columns, width)
              : ({ index }) => calcColumnWidth(index, columns, width)
          }
          columnCount={Array.isArray(columns) ? columns.length : 0}
          fixedColumnCount={fixedColumnCount}
          enableFixedColumnScroll={fixedColumnCount > 0}
          height={multiGridHeight}
          rowHeight={expandedRow ? this.rowHeight : rowHeight}
          rowCount={
            Array.isArray(data) ? data.length + (includeHeaders ? 1 : 0) : 0
          }
          fixedRowCount={fixedRowCount}
          enableFixedRowScroll={fixedRowCount > 0}
          // TODO: Read tehse from `classes` without classes.table inherirtance?  How to pass props.classes down to override?
          classNameTopLeftGrid={'topLeftGrid'}
          classNameTopRightGrid={'topRightGrid'}
          classNameBottomLeftGrid={'bottomLeftGrid'}
          classNameBottomRightGrid={'bottomRightGrid'}
        />

        {pagination && (
          <TableFooter component="div" className={classes.footer}>
            <TablePagination component="div" {...pagination} />
          </TableFooter>
        )}
      </Table>
    );
  }
}

MuiTable.propTypes = {
  data: PropTypes.array,
  columns: PropTypes.array,
  width: PropTypes.number,
  height: PropTypes.number,
  maxHeight: PropTypes.number,
  pagination: PropTypes.object,
  fitHeightToRows: PropTypes.bool,
  fixedRowCount: PropTypes.number,
  fixedColumnCount: PropTypes.number,
  rowHeight: PropTypes.number,
  columnWidth: PropTypes.number,
  includeHeaders: PropTypes.bool,
  orderBy: PropTypes.string,
  orderDirection: PropTypes.string,
  onHeaderClick: PropTypes.func,
  onCellClick: PropTypes.func,
  isCellHovered: PropTypes.func,
  isCellSelected: PropTypes.func,
  classes: PropTypes.object,
  cellProps: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  style: PropTypes.object
};

export default withStyles(styles, { withTheme: true })(MuiTable);
