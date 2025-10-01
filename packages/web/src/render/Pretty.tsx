import React from 'react';
import type { Expr, Path } from '@motor/types';
import { isSamePath, pathKey } from '../selection/brackets';

export interface PrettyProps {
  expr: Expr;
  highlight?: Path;
  onSelect?: (path: Path, event: React.MouseEvent<HTMLSpanElement>) => void;
}

const containerStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4
};

const fractionStyle: React.CSSProperties = {
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center'
};

const fractionBarStyle: React.CSSProperties = {
  width: '100%',
  borderBottom: '1px solid currentColor',
  margin: '2px 0'
};

type NodeViewProps = {
  node: Expr;
  path: Path;
  highlight?: Path;
  onSelect?: PrettyProps['onSelect'];
};

const NodeView: React.FC<NodeViewProps> = ({ node, path, highlight, onSelect }) => {
  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLSpanElement>) => {
      event.stopPropagation();
      onSelect?.(path, event);
    },
    [path, onSelect]
  );

  const key = pathKey(path);
  const highlighted = highlight ? isSamePath(highlight, path) : false;
  const baseProps = {
    'data-path': key,
    onClick: handleClick,
    style: highlighted ? { backgroundColor: '#fff6d6' } : undefined
  } as const;

  switch (node.type) {
    case 'rat':
      return (
        <span {...baseProps} style={{ ...baseProps.style, fontVariantNumeric: 'tabular-nums' }}>
          {node.value.d === 1n ? node.value.n.toString() : (
            <span style={fractionStyle}>
              <span>{node.value.n.toString()}</span>
              <span style={fractionBarStyle} />
              <span>{node.value.d.toString()}</span>
            </span>
          )}
        </span>
      );
    case 'add':
    case 'mul': {
      const symbol = node.type === 'add' ? '+' : '×';
      return (
        <span {...baseProps} style={{ ...containerStyle, ...baseProps.style }}>
          {node.args.map((child, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span>{symbol}</span>}
              <NodeView
                node={child}
                path={[...path, index]}
                highlight={highlight}
                onSelect={onSelect}
              />
            </React.Fragment>
          ))}
        </span>
      );
    }
    case 'sub':
    case 'pow':
      return (
        <span {...baseProps} style={{ ...containerStyle, ...baseProps.style }}>
          <NodeView node={node.left} path={[...path, 'left']} highlight={highlight} onSelect={onSelect} />
          <span>{node.type === 'sub' ? '−' : '^'}</span>
          <NodeView node={node.right} path={[...path, 'right']} highlight={highlight} onSelect={onSelect} />
        </span>
      );
    case 'div':
      return (
        <span {...baseProps}>
          <span style={fractionStyle}>
            <NodeView node={node.left} path={[...path, 'left']} highlight={highlight} onSelect={onSelect} />
            <span style={fractionBarStyle} />
            <NodeView node={node.right} path={[...path, 'right']} highlight={highlight} onSelect={onSelect} />
          </span>
        </span>
      );
    case 'sqrt':
    case 'cbrt':
      return (
        <span {...baseProps} style={{ ...containerStyle, ...baseProps.style }}>
          <span>{node.type === 'sqrt' ? '√' : '∛'}</span>
          <span>(</span>
          <NodeView node={node.arg} path={[...path, 'arg']} highlight={highlight} onSelect={onSelect} />
          <span>)</span>
        </span>
      );
  }
};

export const Pretty: React.FC<PrettyProps> = ({ expr, highlight, onSelect }) => (
  <NodeView node={expr} path={[]} highlight={highlight} onSelect={onSelect} />
);

export default Pretty;
