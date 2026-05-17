import type { EChartsOption } from 'echarts'

interface ChartDatum {
  label: string
  value: number
}

interface BarChartOptions {
  data: ChartDatum[]
  colorIndex?: number
  maxItems?: number
  minHeight?: number
  monochrome?: boolean
  valueFormatter?: (value: number) => string
}

interface DonutChartOptions {
  data: ChartDatum[]
  innerRadius?: string
  outerRadius?: string
  centerValue?: string
  centerLabel?: string
}

interface LineChartOptions {
  data: ChartDatum[]
  colorIndex?: number
}

export function useAdminChartTheme() {
  const colorMode = useColorMode()
  const isDark = computed(() => colorMode.value === 'dark')

  const palette = computed(() => {
    return isDark.value
      ? ['#93C5FD', '#34D399', '#FBBF24', '#F87171', '#C4B5FD', '#F9A8D4']
      : ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777']
  })

  const textColor = computed(() => isDark.value ? '#F8FAFC' : '#0F172A')
  const mutedTextColor = computed(() => isDark.value ? '#94A3B8' : '#64748B')
  const borderColor = computed(() => isDark.value ? '#1E293B' : '#E2E8F0')

  function createBarChartOption({ data, colorIndex = 0, maxItems = 6, minHeight = 0, monochrome = true, valueFormatter }: BarChartOptions): EChartsOption {
    const trimmedData = [...data].slice(0, maxItems)
    const reversedData = trimmedData.reverse()
    const paletteValues = palette.value
    const chartColor = paletteValues.length > 0
      ? paletteValues[colorIndex % paletteValues.length] || paletteValues[0] || '#2563EB'
      : '#2563EB'

    return {
      animationDuration: 400,
      color: palette.value,
      grid: {
        left: 8,
        right: 10,
        top: 10,
        bottom: 0,
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        valueFormatter: value => valueFormatter ? valueFormatter(Number(value)) : String(value),
        axisPointer: {
          type: 'shadow',
          shadowStyle: {
            color: isDark.value ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)',
          },
        },
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          color: mutedTextColor.value,
          formatter: value => valueFormatter ? valueFormatter(Number(value)) : String(value),
        },
        splitLine: {
          lineStyle: {
            color: borderColor.value,
          },
        },
      },
      yAxis: {
        type: 'category',
        data: reversedData.map(item => item.label),
        axisLabel: {
          color: mutedTextColor.value,
          width: 84,
          overflow: 'truncate',
        },
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
      },
      series: [
        {
          type: 'bar',
          data: reversedData.map((item, index) => ({
            value: item.value,
            itemStyle: {
              color: monochrome
                ? chartColor
                : palette.value[index % palette.value.length] ?? chartColor,
              borderRadius: [0, 10, 10, 0],
            },
          })),
          barWidth: 16,
          barMinHeight: minHeight,
          label: {
            show: true,
            position: 'right',
            color: textColor.value,
            fontWeight: 600,
            formatter: params => valueFormatter ? valueFormatter(Number(params.value)) : String(params.value),
          },
        },
      ],
    }
  }

  function createDonutChartOption({ data, innerRadius = '56%', outerRadius = '76%', centerValue, centerLabel }: DonutChartOptions): EChartsOption {
    const chartData = data.map(item => ({
      name: item.label,
      value: item.value,
    }))

    return {
      animationDuration: 400,
      color: palette.value,
      title: centerValue
        ? [
            {
              text: centerValue,
              left: 'center',
              top: '34%',
              textStyle: {
                color: textColor.value,
                fontSize: 24,
                fontWeight: 700,
              },
            },
            {
              text: centerLabel || '',
              left: 'center',
              top: '50%',
              textStyle: {
                color: mutedTextColor.value,
                fontSize: 11,
                fontWeight: 500,
              },
            },
          ]
        : undefined,
      tooltip: {
        trigger: 'item',
      },
      legend: {
        bottom: 0,
        left: 'center',
        textStyle: {
          color: mutedTextColor.value,
        },
      },
      series: [
        {
          type: 'pie',
          stillShowZeroSum: false,
          radius: [innerRadius, outerRadius],
          center: ['50%', '42%'],
          avoidLabelOverlap: true,
          label: {
            show: false,
          },
          labelLine: {
            show: false,
          },
          data: chartData,
        },
      ],
    }
  }

  function createLineChartOption({ data, colorIndex = 0 }: LineChartOptions): EChartsOption {
    const chartColor = palette.value[colorIndex % palette.value.length] ?? palette.value[0] ?? '#2563EB'

    return {
      animationDuration: 400,
      color: [chartColor],
      grid: {
        left: 8,
        right: 8,
        top: 18,
        bottom: 12,
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
      },
      xAxis: {
        type: 'category',
        data: data.map(item => item.label),
        axisLabel: {
          color: mutedTextColor.value,
          fontSize: 11,
        },
        axisLine: {
          lineStyle: {
            color: borderColor.value,
          },
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: mutedTextColor.value,
          fontSize: 11,
        },
        splitLine: {
          lineStyle: {
            color: borderColor.value,
            type: 'dashed',
          },
        },
      },
      series: [
        {
          type: 'line',
          smooth: false,
          symbolSize: 8,
          data: data.map(item => item.value),
          lineStyle: {
            width: 3,
          },
          itemStyle: {
            color: chartColor,
          },
          areaStyle: {
            opacity: isDark.value ? 0.18 : 0.12,
            color: chartColor,
          },
        },
      ],
    }
  }

  return {
    createBarChartOption,
    createDonutChartOption,
    createLineChartOption,
  }
}
