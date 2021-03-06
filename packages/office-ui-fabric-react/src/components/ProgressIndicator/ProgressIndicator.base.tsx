import * as React from 'react';
import {
  BaseComponent,
  classNamesFunction,
  customizable,
} from '../../Utilities';
import {
  IProgressIndicatorProps,
  IProgressIndicatorStyleProps,
  IProgressIndicatorStyles,
} from './ProgressIndicator.types';

const getClassNames = classNamesFunction<IProgressIndicatorStyleProps, IProgressIndicatorStyles>();

// if the percentComplete is near 0, don't animate it.
// This prevents animations on reset to 0 scenarios
const ZERO_THRESHOLD = 0.01;

/**
* ProgressIndicator with no default styles.
* [Use the `getStyles` API to add your own styles.](https://github.com/OfficeDev/office-ui-fabric-react/wiki/Styling)
*/
@customizable('ProgressIndicator', ['theme'])
export class ProgressIndicatorBase extends BaseComponent<IProgressIndicatorProps, {}> {
  public static defaultProps = {
    label: '',
    description: '',
    width: 180
  };

  constructor(props: IProgressIndicatorProps) {
    super(props);

    this._warnDeprecations({
      title: 'label'
    });
  }

  public render() {
    const {
      barHeight,
      className,
      label = this.props.title, // Fall back to deprecated value.
      description,
      getStyles,
      theme,
      progressHidden,
      onRenderProgress = this._onRenderProgress
    } = this.props;

    const percentComplete = typeof this.props.percentComplete === 'number' ?
      Math.min(100, Math.max(0, this.props.percentComplete * 100)) :
      undefined;

    const classNames = getClassNames(getStyles, {
      theme: theme!,
      className,
      barHeight,
      indeterminate: percentComplete === undefined ? true : false,
    });

    return (
      <div className={ classNames.root }>
        {
          label ? (
            <div className={ classNames.itemName }>{ label }</div>
          ) : null
        }
        {
          !progressHidden ? onRenderProgress({
            ...(this.props as IProgressIndicatorProps),
            percentComplete: percentComplete
          }, this._onRenderProgress) : null
        }
        {
          description ? (
            <div className={ classNames.itemDescription }>{ description }</div>
          ) : null
        }
      </div>
    );
  }

  private _onRenderProgress = (props: IProgressIndicatorProps): JSX.Element => {
    const {
      ariaValueText,
      barHeight,
      className,
      getStyles,
      theme,
    } = this.props;

    const percentComplete = typeof this.props.percentComplete === 'number' ?
      Math.min(100, Math.max(0, this.props.percentComplete * 100)) :
      undefined;

    const classNames = getClassNames(getStyles, {
      theme: theme!,
      className,
      barHeight,
      indeterminate: percentComplete === undefined ? true : false,
    });

    const progressBarStyles = {
      width: percentComplete !== undefined ? percentComplete + '%' : undefined,
      transition: (percentComplete !== undefined && percentComplete < ZERO_THRESHOLD) ? 'none' : undefined,
    };

    return (
      <div className={ classNames.itemProgress }>
        <div className={ classNames.progressTrack } />
        <div
          className={ classNames.progressBar }
          style={ progressBarStyles }
          role='progressbar'
          aria-valuemin={ 0 }
          aria-valuemax={ 100 }
          aria-valuenow={ Math.floor(percentComplete!) }
          aria-valuetext={ ariaValueText }
        />
      </div>
    );
  }
}
