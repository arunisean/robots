import { AgentConfigFormSchema, ConfigFieldSchema } from '../types/agent-type';
import { AgentCategory } from '../types/agent';

/**
 * ConfigSchema构建器 - 帮助创建Agent配置Schema
 */
export class ConfigSchemaBuilder {
  private schema: AgentConfigFormSchema;

  constructor() {
    this.schema = {
      type: 'object',
      properties: {},
      required: []
    };
  }

  /**
   * 添加字段
   */
  addField(name: string, field: ConfigFieldSchema): this {
    this.schema.properties[name] = field;
    return this;
  }

  /**
   * 设置必填字段
   */
  setRequired(fields: string[]): this {
    this.schema.required = fields;
    return this;
  }

  /**
   * 添加字段依赖
   */
  addDependency(field: string, dependsOn: string[]): this {
    if (!this.schema.dependencies) {
      this.schema.dependencies = {};
    }
    this.schema.dependencies[field] = dependsOn;
    return this;
  }

  /**
   * 构建Schema
   */
  build(): AgentConfigFormSchema {
    return { ...this.schema };
  }

  /**
   * 添加基本信息字段（所有Agent都需要）
   */
  addBasicFields(): this {
    return this
      .addField('name', {
        type: 'string',
        title: '名称',
        description: 'Agent的显示名称',
        ui: {
          widget: 'input',
          placeholder: '请输入Agent名称',
          group: 'basic',
          order: 1
        }
      })
      .addField('description', {
        type: 'string',
        title: '描述',
        description: 'Agent的功能描述',
        ui: {
          widget: 'textarea',
          placeholder: '请描述这个Agent的功能和用途',
          group: 'basic',
          order: 2
        }
      })
      .addField('enabled', {
        type: 'boolean',
        title: '启用',
        description: '是否启用此Agent',
        default: true,
        ui: {
          widget: 'checkbox',
          group: 'basic',
          order: 3
        }
      });
  }

  /**
   * 添加调度字段
   */
  addScheduleFields(): this {
    return this.addField('schedule', {
      type: 'object',
      title: '执行计划',
      description: '设置Agent的执行时间和频率',
      properties: {
        type: {
          type: 'string',
          title: '调度类型',
          description: '选择执行方式',
          enum: ['manual', 'interval', 'cron'],
          default: 'manual',
          ui: {
            widget: 'select',
            order: 1
          }
        },
        interval: {
          type: 'number',
          title: '间隔时间（分钟）',
          description: '每隔多少分钟执行一次',
          minimum: 1,
          default: 60,
          ui: {
            widget: 'input',
            order: 2,
            conditional: {
              field: 'schedule.type',
              value: 'interval'
            }
          }
        },
        cron: {
          type: 'string',
          title: 'Cron表达式',
          description: '使用标准Cron格式',
          pattern: '^[0-9*,/-]+ [0-9*,/-]+ [0-9*,/-]+ [0-9*,/-]+ [0-9*,/-]+$',
          ui: {
            widget: 'input',
            placeholder: '0 0 * * *',
            helpText: '例如：0 0 * * * 表示每天午夜执行',
            order: 3,
            conditional: {
              field: 'schedule.type',
              value: 'cron'
            }
          }
        }
      },
      ui: {
        widget: 'input',
        group: 'schedule',
        order: 100
      }
    });
  }

  /**
   * 添加重试和错误处理字段
   */
  addErrorHandlingFields(): this {
    return this
      .addField('retries', {
        type: 'number',
        title: '重试次数',
        description: '执行失败时的重试次数',
        minimum: 0,
        maximum: 10,
        default: 3,
        ui: {
          widget: 'slider',
          group: 'advanced',
          order: 201
        }
      })
      .addField('timeout', {
        type: 'number',
        title: '超时时间（秒）',
        description: '单次执行的最大时间',
        minimum: 1,
        maximum: 3600,
        default: 300,
        ui: {
          widget: 'input',
          group: 'advanced',
          order: 202
        }
      });
  }
}

/**
 * 预定义的字段创建函数
 */
export const ConfigFields = {
  /**
   * URL字段
   */
  url(title: string = 'URL', description: string = '目标URL地址'): ConfigFieldSchema {
    return {
      type: 'string',
      title,
      description,
      format: 'uri',
      ui: {
        widget: 'input',
        placeholder: 'https://example.com'
      }
    };
  },

  /**
   * CSS选择器字段
   */
  cssSelector(title: string, description: string): ConfigFieldSchema {
    return {
      type: 'string',
      title,
      description,
      ui: {
        widget: 'input',
        placeholder: '.class-name, #id, tag',
        helpText: '使用CSS选择器语法'
      }
    };
  },

  /**
   * API密钥字段
   */
  apiKey(title: string = 'API密钥', description: string = 'API访问密钥'): ConfigFieldSchema {
    return {
      type: 'string',
      title,
      description,
      ui: {
        widget: 'input',
        placeholder: '请输入API密钥'
      }
    };
  },

  /**
   * 文本输入字段
   */
  text(title: string, description: string, placeholder?: string): ConfigFieldSchema {
    return {
      type: 'string',
      title,
      description,
      ui: {
        widget: 'input',
        ...(placeholder && { placeholder })
      }
    };
  },

  /**
   * 文本区域字段
   */
  textarea(title: string, description: string, placeholder?: string): ConfigFieldSchema {
    return {
      type: 'string',
      title,
      description,
      ui: {
        widget: 'textarea',
        ...(placeholder && { placeholder })
      }
    };
  },

  /**
   * 选择字段
   */
  select(title: string, description: string, options: string[], defaultValue?: string): ConfigFieldSchema {
    return {
      type: 'string',
      title,
      description,
      enum: options,
      ...(defaultValue && { default: defaultValue }),
      ui: {
        widget: 'select'
      }
    };
  },

  /**
   * 数字字段
   */
  number(title: string, description: string, min?: number, max?: number, defaultValue?: number): ConfigFieldSchema {
    return {
      type: 'number',
      title,
      description,
      ...(min !== undefined && { minimum: min }),
      ...(max !== undefined && { maximum: max }),
      ...(defaultValue !== undefined && { default: defaultValue }),
      ui: {
        widget: 'input'
      }
    };
  },

  /**
   * 布尔字段
   */
  boolean(title: string, description: string, defaultValue: boolean = false): ConfigFieldSchema {
    return {
      type: 'boolean',
      title,
      description,
      default: defaultValue,
      ui: {
        widget: 'checkbox'
      }
    };
  },

  /**
   * 对象字段
   */
  object(title: string, description: string, properties: { [key: string]: ConfigFieldSchema }): ConfigFieldSchema {
    return {
      type: 'object',
      title,
      description,
      properties,
      ui: {
        widget: 'input'
      }
    };
  }
};

/**
 * 根据Agent Category生成基础Schema
 */
export function createBaseSchemaForCategory(category: AgentCategory): AgentConfigFormSchema {
  const builder = new ConfigSchemaBuilder()
    .addBasicFields()
    .addScheduleFields()
    .addErrorHandlingFields();

  return builder.setRequired(['name']).build();
}

/**
 * 验证配置是否符合Schema
 */
export function validateConfigAgainstSchema(
  config: any,
  schema: AgentConfigFormSchema
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 检查必填字段
  for (const field of schema.required) {
    if (config[field] === undefined || config[field] === null || config[field] === '') {
      errors.push(`缺少必填字段: ${field}`);
    }
  }

  // 检查字段类型和格式
  for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
    const value = config[fieldName];
    if (value !== undefined && value !== null) {
      const fieldErrors = validateFieldValue(value, fieldSchema, fieldName);
      errors.push(...fieldErrors);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 验证单个字段值
 */
function validateFieldValue(
  value: any,
  schema: ConfigFieldSchema,
  fieldName: string
): string[] {
  const errors: string[] = [];

  // 类型检查
  const expectedType = schema.type;
  const actualType = Array.isArray(value) ? 'array' : typeof value;

  if (expectedType === 'object' && actualType !== 'object') {
    errors.push(`字段 ${fieldName} 类型错误，期望 object，实际 ${actualType}`);
    return errors;
  } else if (expectedType !== 'object' && expectedType !== actualType) {
    errors.push(`字段 ${fieldName} 类型错误，期望 ${expectedType}，实际 ${actualType}`);
    return errors;
  }

  // 字符串验证
  if (schema.type === 'string' && typeof value === 'string') {
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`字段 ${fieldName} 格式不正确`);
    }
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`字段 ${fieldName} 值不在允许范围内`);
    }
  }

  // 数字验证
  if (schema.type === 'number' && typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`字段 ${fieldName} 不能小于 ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`字段 ${fieldName} 不能大于 ${schema.maximum}`);
    }
  }

  return errors;
}
