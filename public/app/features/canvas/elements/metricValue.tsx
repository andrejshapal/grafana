import { css } from '@emotion/css';
import React, { useCallback } from 'react';
import { useObservable } from 'react-use';
import { of } from 'rxjs';

import { DataFrame, FieldNamePickerConfigSettings, GrafanaTheme2, StandardEditorsRegistryItem } from '@grafana/data';
import { usePanelContext, useStyles2 } from '@grafana/ui';
import { FieldNamePicker } from '@grafana/ui/src/components/MatchersUI/FieldNamePicker';
import { TextDimensionMode } from 'app/features/dimensions';
import { DimensionContext } from 'app/features/dimensions/context';
import { ColorDimensionEditor } from 'app/features/dimensions/editors/ColorDimensionEditor';
import { TextDimensionEditor } from 'app/features/dimensions/editors/TextDimensionEditor';

import { CanvasElementItem, CanvasElementProps, defaultBgColor, defaultTextColor } from '../element';
import { ElementState } from '../runtime/element';

import { Align, TextBoxConfig, TextBoxData, VAlign } from './textBox';

// eslint-disable-next-line
const dummyFieldSettings: StandardEditorsRegistryItem<string, FieldNamePickerConfigSettings> = {
  settings: {},
} as StandardEditorsRegistryItem<string, FieldNamePickerConfigSettings>;

const MetricValueDisplay = (props: CanvasElementProps<TextBoxConfig, TextBoxData>) => {
  const { data, isSelected } = props;
  const styles = useStyles2(getStyles(data));

  const context = usePanelContext();
  const scene = context.instanceState?.scene;

  const isEditMode = useObservable<boolean>(scene?.editModeEnabled ?? of(false));

  if (isEditMode && isSelected) {
    return <MetricValueEdit {...props} />;
  }
  return (
    <div className={styles.container}>
      <span className={styles.span}>{data?.text ? data.text : 'Double click to set field'}</span>
    </div>
  );
};

const MetricValueEdit = (props: CanvasElementProps<TextBoxConfig, TextBoxData>) => {
  let { data, config } = props;
  const context = usePanelContext();
  let panelData: DataFrame[];
  panelData = context.instanceState?.scene?.data.series;

  const onFieldChange = useCallback(
    (field) => {
      let selectedElement: ElementState;
      selectedElement = context.instanceState?.selected[0];
      if (selectedElement) {
        const options = selectedElement.options;
        selectedElement.onChange({
          ...options,
          config: {
            ...options.config,
            text: { fixed: '', field: field, mode: TextDimensionMode.Field },
          },
          background: {
            color: { field: field, fixed: options.background?.color?.fixed ?? '' },
          },
        });

        // Force a re-render (update scene data after config update)
        const scene = context.instanceState?.scene;
        if (scene) {
          scene.editModeEnabled.next(false);
          scene.updateData(scene.data);
        }
      }
    },
    [context.instanceState?.scene, context.instanceState?.selected]
  );

  const styles = useStyles2(getStyles(data));
  return (
    <div className={styles.inlineEditorContainer}>
      {panelData && (
        <FieldNamePicker
          context={{ data: panelData }}
          value={config.text?.field ?? ''}
          onChange={onFieldChange}
          item={dummyFieldSettings}
        />
      )}
    </div>
  );
};

const getStyles = (data: TextBoxData | undefined) => (theme: GrafanaTheme2) => ({
  container: css`
    position: absolute;
    height: 100%;
    width: 100%;
    display: table;
  `,
  inlineEditorContainer: css`
    height: 100%;
    width: 100%;
    display: flex;
    align-items: center;
    padding: 10px;
  `,
  span: css`
    display: table-cell;
    vertical-align: ${data?.valign};
    text-align: ${data?.align};
    font-size: ${data?.size}px;
    color: ${data?.color};
  `,
});

export const metricValueItem: CanvasElementItem<TextBoxConfig, TextBoxData> = {
  id: 'metric-value',
  name: 'Metric Value',
  description: 'Display a field value',

  display: MetricValueDisplay,

  hasEditMode: true,

  defaultSize: {
    width: 260,
    height: 50,
  },

  getNewOptions: (options) => ({
    ...options,
    config: {
      align: Align.Center,
      valign: VAlign.Middle,
      color: {
        fixed: defaultTextColor,
      },
      text: { mode: TextDimensionMode.Field, fixed: '', field: '' },
      size: 20,
    },
    background: {
      color: {
        fixed: defaultBgColor,
      },
    },
    placement: {
      top: 100,
      left: 100,
    },
  }),

  prepareData: (ctx: DimensionContext, cfg: TextBoxConfig) => {
    const data: TextBoxData = {
      text: cfg.text ? ctx.getText(cfg.text).value() : '',
      align: cfg.align ?? Align.Center,
      valign: cfg.valign ?? VAlign.Middle,
      size: cfg.size,
    };

    if (cfg.color) {
      data.color = ctx.getColor(cfg.color).value();
    }

    return data;
  },

  registerOptionsUI: (builder) => {
    const category = ['Metric value'];
    builder
      .addCustomEditor({
        category,
        id: 'textSelector',
        path: 'config.text',
        name: 'Text',
        editor: TextDimensionEditor,
      })
      .addCustomEditor({
        category,
        id: 'config.color',
        path: 'config.color',
        name: 'Text color',
        editor: ColorDimensionEditor,
        settings: {},
        defaultValue: {},
      })
      .addRadio({
        category,
        path: 'config.align',
        name: 'Align text',
        settings: {
          options: [
            { value: Align.Left, label: 'Left' },
            { value: Align.Center, label: 'Center' },
            { value: Align.Right, label: 'Right' },
          ],
        },
        defaultValue: Align.Left,
      })
      .addRadio({
        category,
        path: 'config.valign',
        name: 'Vertical align',
        settings: {
          options: [
            { value: VAlign.Top, label: 'Top' },
            { value: VAlign.Middle, label: 'Middle' },
            { value: VAlign.Bottom, label: 'Bottom' },
          ],
        },
        defaultValue: VAlign.Middle,
      })
      .addNumberInput({
        category,
        path: 'config.size',
        name: 'Text size',
        settings: {
          placeholder: 'Auto',
        },
      });
  },
};
