//@ts-nocheck
import React, { useEffect, useState, useMemo } from "react";
import styled from "styled-components";
import {
  useTable,
  useFilters,
  useSortBy,
  usePagination,
  useExpanded,
  useRowSelect,
  useRowState,
  useFlexLayout
} from "react-table";
// import { TablePagination } from './TablePagination';
import { useDebouncedCallback } from "use-debounce";
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { CircularProgress } from "@material-ui/core";
// import { RefreshButton } from 'components/RefreshButton/RefreshButton';
// import { useDebug } from 'components/DebugProvider/useDebug';
// import { CustomCheckbox } from 'components/CustomCheckbox/CustomCheckbox';
import { FixedSizeList } from "react-window";

const dateKeywordsRegex = /(date|dos|dob)/gi;
const SLATE_BLUE = "#415464";

const SETTINGS = {
  ROW_HEIGHT: "38px",
  HIGHLIGHTED_ROW_COLOR: "#add8e6"
};

const Styles = styled.div`
  position: relative;
  max-height: ${(props) => (props.height ? props.height : "600px")};
  overflow: auto;
  width: 100%;
  thead tr th {
    position: sticky;
    top: 0;
    z-index: 998;
  }
  table {
    border-spacing: 0;
    border: 1px solid ${SLATE_BLUE};
    border-bottom: none;
    width: 100%;

    th {
      background: ${SLATE_BLUE};
      font-weight: 400;
      color: white;
      padding: 0 0.2rem;
      border-bottom: 1px solid ${SLATE_BLUE};
      border-right: 1px solid ${SLATE_BLUE};
    }
    td {
      margin: 0;
      padding: 0.5rem 0.5rem;
      border-bottom: 1px solid ${SLATE_BLUE};
      border-right: 1px solid ${SLATE_BLUE};
      white-space: nowrap;
    }
  }
`;

const TR = styled.tr`
  :nth-child(even) {
    :hover {
      background: ${(props) =>
        props.highlightSelected
          ? SETTINGS.HIGHLIGHTED_ROW_COLOR
          : "rgb(184, 183, 183)"};
    }
    background: ${(props) =>
      props.highlightSelected
        ? SETTINGS.HIGHLIGHTED_ROW_COLOR
        : "rgb(189, 189, 189)"};
  }
  :nth-child(odd) {
    background: ${(props) =>
      props.highlightSelected
        ? SETTINGS.HIGHLIGHTED_ROW_COLOR
        : "rgb(231, 230, 230)"};
  }
  :hover {
    background: ${(props) =>
      props.highlightSelected
        ? SETTINGS.HIGHLIGHTED_ROW_COLOR
        : "rgb(224, 224, 224)"};
  }
  td {
    border-top: ${(props) => (props.row?.isExpanded ? "5px solid black" : "")};
  }
  td:first-child {
    border-left: ${(props) => (props.row?.isExpanded ? "5px solid black" : "")};
  }
  td:last-child {
    border-right: ${(props) =>
      props.row?.isExpanded ? "5px solid black" : ""};
  }
  height: ${SETTINGS.ROW_HEIGHT};
`;
const TableRow = ({
  children,
  row,
  onExpandedChange = () => {},
  onRowSelected = () => {},
  ...props
}) => {
  useEffect(() => {
    onExpandedChange({ row });
  }, [row.isExpanded]);
  useEffect(() => {
    onRowSelected({ isSelected: row.isSelected });
  }, [row.isSelected]);
  return (
    <TR row={row} {...props}>
      {children}
    </TR>
  );
};
const DefaultHeader = styled.div`
  cursor: pointer;
  padding: 5px;
  white-space: nowrap;

  box-shadow: ${(props) =>
    props.isSorted && !props.isSortedDesc
      ? `inset 0 2px 0 0 rgba(0,0,0,.6)`
      : ""};
  box-shadow: ${(props) =>
    props.isSorted && props.isSortedDesc
      ? `inset 0 -2px 0 0 rgba(0,0,0,.6)`
      : ""};
`;
const DefaultColumnFilter = ({
  column: { setFilter, filterId = "", filterable = true },
  data
}) => {
  const [filterText, setFilterText] = useState("");
  const [debouncedFilter] = useDebouncedCallback((value) => {
    setFilter(value || undefined); // Set undefined to remove the filter entirely
  }, 150);
  useEffect(() => {
    debouncedFilter(filterText);
  }, [filterText]);
  useEffect(() => {
    setFilterText("");
  }, [data]);
  return (
    <div
      style={{
        width: "100%",
        position: "relative",
        paddingBottom: "5px",
        border: `1px solid ${SLATE_BLUE}`
      }}
    >
      <input
        value={filterText || ""}
        autoComplete="new-password"
        id={`table-filter-${filterId}`}
        onChange={(e) => {
          setFilterText(e.target.value);
        }}
        placeholder={`Filter`}
        style={{
          borderRadius: "2px",
          padding: "4px 0 4px 4px",
          outline: "none",
          width: "100%",
          border: "none",
          visibility: filterable ? "visible" : "hidden"
        }}
      />
      {/* {filterText && (
        <FontAwesomeIcon
          onClick={() => {
            setFilterText('');
          }}
          id={`filter-clear-btn-${filterId}`}
          icon="times"
          size="lg"
          style={{
            position: 'absolute',
            right: 5,
            top: '46%',
            transform: 'translateY(-50%)',
            color: 'grey',
            cursor: 'pointer'
          }}
        />
      )} */}
    </div>
  );
};
const DefaultCell = ({ column, cell }) => {
  return cell?.value ?? "";
};
const BackgroundOverlay = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.1);
`;
export function HorizonTable({
  columns = [],
  data = [],
  defaultPageSize = 5,
  pageSize = 0,
  style = {},
  loading = false,
  filterable = true,
  sortable = true,
  showHeader = true,
  showPagination = true,
  pageSizeOptions = [5, 10, 15, 20, 25, 50],
  paginationProps = {
    prevBtnProps: {},
    nextBtnProps: {}
  },
  onDataChange = () => {},
  getTrProps = () => {},
  initialState = {},
  refetch = false,
  refreshBtnId = "",
  renderRowSubComponent = false,
  useTableProps = {},
  getTableProps = () => {},
  getHeaderProps = () => {},
  enableUseRowSelect = false,
  ...props
}) {
  // const { debug } = useDebug();
  // Use the state and functions returned from useTable to build your UI
  const defaultColumn = React.useMemo(
    () => ({
      // Let's set up our default Filter UI
      Filter: DefaultColumnFilter,
      Header: DefaultHeader,
      Cell: DefaultCell
    }),
    []
  );
  const memoizedColumns = useMemo(
    () =>
      columns.map((column) => {
        return {
          ...column,
          sort:
            column.sort || dateKeywordsRegex.test(column.accessor)
              ? "datetime"
              : "alphanumeric",
          filter:
            column.filter || dateKeywordsRegex.test(column.accessor)
              ? (rows, id, filterValue) => {
                  const [dateId] = id;
                  const newRows = [...rows];
                  return newRows
                    .map((row) => {
                      return {
                        ...row,
                        original: {
                          ...row.original
                        }
                      };
                    })
                    .filter((row) => {
                      return (
                        row.original[dateId]
                          .replace(/\//g, "")
                          .startsWith(filterValue) ||
                        row.original[dateId].startsWith(filterValue)
                      );
                    });
                }
              : "text"
        };
      }),
    [columns]
  );
  const table = useTable(
    {
      initialState: {
        pageSize: defaultPageSize,
        ...initialState
      },
      columns: memoizedColumns,
      data: data || [],
      defaultColumn,
      ...useTableProps
    },
    useFilters,
    useSortBy,
    useExpanded,
    usePagination,
    useRowSelect,
    useRowState,
    useFlexLayout,
    (hooks) => {
      if (enableUseRowSelect) {
        hooks.visibleColumns.push((columns) => [
          // Let's make a column for selection
          {
            filterable: false,
            id: "selection",
            // The header can use the table's getToggleAllRowsSelectedProps method
            // to render a checkbox

            // The cell can use the individual row's getToggleRowSelectedProps method
            // to the render a checkbox
            Cell: ({ row }) => (
              <div>
                {/* <CustomCheckbox {...row.getToggleRowSelectedProps()} /> */}
              </div>
            )
          },
          ...columns
        ]);
      }
    }
  );
  useEffect(() => {
    if (pageSize) {
      table.setPageSize(Number(data.length));
    }
  }, [data]);
  useEffect(() => {
    if (onDataChange && data) {
      onDataChange({
        data,
        table
      });
    }
  }, [data]);

  const alignCell = (value) => {
    if (/^\b\d+\b$/.test(value)) {
      return "right";
    } else if (
      //https://regexr.com/57k8e
      /^\b(\d{2}(?:\d{2})?)[/-](\d{2}(?:\d{2})?)[/-](\d{2}(?:\d{2})?)(T\d{2}:\d{2}:\d{2})?\b$/.test(
        value
      )
    ) {
      return "center";
    } else {
      return "left";
    }
  };
  // Render the UI for your table
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        width: "100%",
        ...style
      }}
    >
      {/* {debug && JSON.stringify(table.state, undefined, 4)}
      {refetch && (
        <RefreshButton
          refetch={refetch}
          isRefreshing={loading}
          disabled={loading}
          id={`${refreshBtnId ? refreshBtnId + '-' : ''}refresh-btn`}
          style={{
            alignSelf: 'flex-end',
            marginBottom: '12px'
          }}
        />
      )} */}
      <Styles height={style.height} id={props.id || "table-scroller"}>
        <table
          {...table.getTableProps({
            ...getTableProps()
          })}
        >
          {showHeader && (
            <thead>
              {table.headerGroups.map((headerGroup) => (
                <tr {...headerGroup.getHeaderGroupProps()}>
                  {headerGroup.headers.map((column) => {
                    const sortableProps = sortable
                      ? column.getSortByToggleProps()
                      : {
                          style: {
                            cursor: "default"
                          }
                        };
                    return (
                      <th
                        {...column.getHeaderProps({
                          ...getHeaderProps()
                        })}
                      >
                        <DefaultHeader {...column} {...sortableProps}>
                          {column.render("Header")}
                        </DefaultHeader>

                        {filterable && (
                          <div
                            style={{
                              marginTop: "6px",
                              padding: "0 4px"
                            }}
                          >
                            {column.render("Filter")}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
          )}
          <tbody {...table.getTableBodyProps()}>
            {table.page.map((row, i) => {
              table.prepareRow(row);
              return (
                <>
                  <TableRow
                    row={row}
                    {...row.getRowProps({
                      ...getTrProps(table.state, row)
                    })}
                  >
                    {row.cells.map((cell) => {
                      const cellProps = cell.column.getCellProps
                        ? cell.column.getCellProps()
                        : {};
                      return (
                        <td
                          style={
                            cell?.column?.style
                              ? {
                                  textAlign: alignCell(cell.value),
                                  ...cell.column.style
                                }
                              : {
                                  textAlign: alignCell(cell.value)
                                }
                          }
                          {...cell.getCellProps({
                            ...cellProps
                          })}
                        >
                          {cell.render("Cell")}
                        </td>
                      );
                    })}
                  </TableRow>
                  {/*
                    If the row is in an expanded state, render a row with a
                    column that fills the entire length of the table.
                  */}
                  {renderRowSubComponent && row.isExpanded ? (
                    <tr>
                      <td
                        colSpan={table.visibleColumns.length}
                        style={{
                          padding: "1.5rem",
                          borderBottom: "10px solid #a7a7a7",
                          border: row.isExpanded ? "5px solid black" : "none",
                          borderTop: "none"
                        }}
                      >
                        {/*
                          Inside it, call our renderRowSubComponent function. In reality,
                          you could pass whatever you want as props to
                          a component like this, including the entire
                          table instance. But for this example, we'll just
                          pass the row
                        */}
                        {renderRowSubComponent({ data, row })}
                      </td>
                    </tr>
                  ) : null}
                </>
              );
            })}
            {/* creates empty rows if the last page has less than all the other pages*/}
            {data.length > 0 &&
              table.page.length < table.state.pageSize &&
              [...new Array(table.state.pageSize - table.page.length)].map(
                (_, i) => {
                  return (
                    <TR key={i}>
                      {columns.map((_, i) => {
                        return <td key={i} />;
                      })}
                    </TR>
                  );
                }
              )}
            {/* Creates empty rows when no data */}
            {data.length === 0 &&
              [...new Array(defaultPageSize)].map((_, i) => {
                return (
                  <TR key={i}>
                    {columns.map((_, i) => {
                      return <td key={i} />;
                    })}
                  </TR>
                );
              })}
          </tbody>
        </table>
        {data.length === 0 && !loading && (
          <BackgroundOverlay>
            <div
              style={{
                background: "lightgrey",
                border: `1px solid ${SLATE_BLUE}`,
                padding: "2em"
              }}
            >
              No Data
            </div>
          </BackgroundOverlay>
        )}
        {loading && (
          <BackgroundOverlay>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "lightgrey",
                border: `1px solid ${SLATE_BLUE}`,
                padding: "2em"
              }}
            >
              <span
                style={{
                  marginRight: "4px"
                }}
              >
                Loading
              </span>{" "}
              <CircularProgress size={20} />
            </div>
          </BackgroundOverlay>
        )}
      </Styles>
      {/* {showPagination && (
        <TablePagination
          paginationProps={paginationProps}
          table={table}
          pageSizeOptions={pageSizeOptions}
          tableId={props.id}
          data={data}
        />
      )} */}
    </div>
  );
}
