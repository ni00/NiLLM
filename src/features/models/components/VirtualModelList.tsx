import {
    memo,
    useCallback,
    useLayoutEffect,
    useMemo,
    useRef,
    useState
} from 'react'
import {
    closestCenter,
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent
} from '@dnd-kit/core'
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    type SortingStrategy
} from '@dnd-kit/sortable'
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual'
import { ModelProviderHeader } from './ModelProviderHeader'
import { ModelCard } from './ModelCard'
import { modelColumns, modelRows, type ModelGroup } from '../domain/model-rows'
import type { ProviderConnection } from '@/lib/providers/discovery'
import type { LLMModel } from '@/lib/types'

type ModelStats = { avgTPS: string; avgTTFT: string; totalTokens: number }
interface CardActions {
    onEdit: (model: LLMModel) => void
    onDuplicate: (model: LLMModel) => void
    onDelete: (id: string) => void
    onToggle: (id: string) => void
}
interface Props extends CardActions {
    groups: ModelGroup[]
    reordering: boolean
    filterKey: string
    activeModelIds: string[]
    getModelStats: (model: LLMModel) => ModelStats
    onDragEnd: (event: DragEndEvent) => void
    onFetchProvider: (connection: ProviderConnection) => void
    onSelectProvider: (ids: string[], active: boolean) => void
}

// Offscreen rectangles do not exist in a virtual grid. The overlay and drop
// outline show the destination; reordering takes place when the user drops.
const overlaySorting: SortingStrategy = () => null
const noLayoutAnimation = () => false

const SortableModelCard = memo(function SortableModelCard({
    model,
    isActive,
    avgTPS,
    avgTTFT,
    totalTokens,
    ...actions
}: CardActions & ModelStats & { model: LLMModel; isActive: boolean }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        isDragging,
        isOver
    } = useSortable({
        id: model.id,
        animateLayoutChanges: noLayoutAnimation,
        resizeObserverConfig: { updateMeasurementsFor: [model.id] }
    })
    const dragHandleProps = useMemo(
        () => ({
            ...attributes,
            ...listeners,
            ref: setActivatorNodeRef
        }),
        [attributes, listeners, setActivatorNodeRef]
    )
    return (
        <div
            ref={setNodeRef}
            data-model-id={model.id}
            className={`h-full rounded-xl ${isOver && !isDragging ? 'ring-2 ring-primary' : ''}`}
            style={{ opacity: isDragging ? 0.3 : 1 }}
        >
            <ModelCard
                model={model}
                isActive={isActive}
                avgTPS={avgTPS}
                avgTTFT={avgTTFT}
                totalTokens={totalTokens}
                {...actions}
                dragHandleProps={dragHandleProps}
            />
        </div>
    )
})

const ModelGridRow = memo(function ModelGridRow({
    models,
    columns,
    selected,
    reordering,
    getModelStats,
    ...actions
}: CardActions &
    Pick<Props, 'reordering' | 'getModelStats'> & {
        models: LLMModel[]
        columns: number
        selected: Set<string>
    }) {
    return (
        <div
            className="grid gap-4"
            style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
            }}
        >
            {models.map((model) =>
                reordering ? (
                    <SortableModelCard
                        key={model.id}
                        model={model}
                        isActive={selected.has(model.id)}
                        {...getModelStats(model)}
                        {...actions}
                    />
                ) : (
                    <div
                        key={model.id}
                        data-model-id={model.id}
                        className="h-full"
                    >
                        <ModelCard
                            model={model}
                            isActive={selected.has(model.id)}
                            {...getModelStats(model)}
                            {...actions}
                        />
                    </div>
                )
            )}
        </div>
    )
})

export function VirtualModelList({
    groups,
    reordering,
    filterKey,
    activeModelIds,
    getModelStats,
    onDragEnd,
    onFetchProvider,
    onSelectProvider,
    ...actions
}: Props) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const widthRef = useRef<HTMLDivElement>(null)
    const [columns, setColumns] = useState(1)
    const [activeId, setActiveId] = useState<string | null>(null)
    const [focusedId, setFocusedId] = useState<string | null>(null)
    useLayoutEffect(() => {
        const element = widthRef.current
        if (!element) return
        const update = () => setColumns(modelColumns(element.clientWidth))
        update()
        const observer = new ResizeObserver(update)
        observer.observe(element)
        return () => observer.disconnect()
    }, [])
    const rows = useMemo(() => modelRows(groups, columns), [groups, columns])
    const modelRowIndices = useMemo(() => {
        const indices = new Map<string, number>()
        rows.forEach((row, index) => {
            if (row.kind === 'cards')
                row.models.forEach((model) => indices.set(model.id, index))
        })
        return indices
    }, [rows])
    const selected = useMemo(() => new Set(activeModelIds), [activeModelIds])
    const selection = useMemo(
        () =>
            new Map(
                groups.map((group) => {
                    const enabled = group.models.filter(
                        (model) => model.enabled
                    )
                    return [
                        group.key,
                        {
                            count: group.models.filter((model) =>
                                selected.has(model.id)
                            ).length,
                            all:
                                enabled.length > 0 &&
                                enabled.every((model) => selected.has(model.id))
                        }
                    ]
                })
            ),
        [groups, selected]
    )
    const virtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
        count: rows.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: (index) => (rows[index].kind === 'header' ? 100 : 224),
        getItemKey: (index) => rows[index].key,
        overscan: 3,
        useFlushSync: false,
        directDomUpdates: true,
        rangeExtractor: useCallback(
            (range) => {
                const visible = new Set(defaultRangeExtractor(range))
                // Keep the source mounted during auto-scroll, and preserve keyboard
                // focus if the user scrolls away from a focused card.
                for (const id of [activeId, focusedId]) {
                    const index = id ? modelRowIndices.get(id) : undefined
                    if (index !== undefined) visible.add(index)
                }
                return [...visible].sort((a, b) => a - b)
            },
            [activeId, focusedId, modelRowIndices]
        )
    })
    useLayoutEffect(() => {
        virtualizer.scrollToOffset(0)
    }, [filterKey, virtualizer])
    const virtualItems = virtualizer.getVirtualItems()
    const mountedIds = useMemo(
        () =>
            virtualItems.flatMap((item) => {
                const row = rows[item.index]
                return row.kind === 'cards'
                    ? row.models.map((model) => model.id)
                    : []
            }),
        [virtualItems, rows]
    )
    const mountedGroups = new Map<string, typeof virtualItems>()
    for (const item of virtualItems) {
        const key = rows[item.index].group.key
        const items = mountedGroups.get(key) || []
        items.push(item)
        mountedGroups.set(key, items)
    }
    const activeModel = useMemo(
        () =>
            activeId
                ? groups
                      .flatMap((group) => group.models)
                      .find((model) => model.id === activeId)
                : undefined,
        [activeId, groups]
    )
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates
        })
    )
    return (
        <div
            ref={scrollRef}
            data-models-scroll-viewport
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 md:px-6 pb-4 md:pb-6"
            aria-label="Model list"
            role="region"
            tabIndex={0}
        >
            <div ref={widthRef}>
                {!groups.length && (
                    <p className="py-12 text-center text-muted-foreground">
                        No models match your search.
                    </p>
                )}
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={(event) =>
                        setActiveId(String(event.active.id))
                    }
                    onDragCancel={() => setActiveId(null)}
                    onDragEnd={(event) => {
                        onDragEnd(event)
                        setActiveId(null)
                    }}
                >
                    <SortableContext
                        items={mountedIds}
                        strategy={overlaySorting}
                    >
                        <div
                            ref={virtualizer.containerRef}
                            className="relative w-full"
                            onFocusCapture={(event) =>
                                setFocusedId(
                                    (
                                        event.target as HTMLElement
                                    ).closest<HTMLElement>('[data-model-id]')
                                        ?.dataset.modelId || null
                                )
                            }
                            onBlurCapture={(event) => {
                                if (
                                    !event.currentTarget.contains(
                                        event.relatedTarget
                                    )
                                )
                                    setFocusedId(null)
                            }}
                        >
                            {[...mountedGroups].map(([key, items]) => (
                                <section
                                    key={key}
                                    aria-label={
                                        rows[items[0].index].group.label
                                    }
                                >
                                    {items.map((item) => {
                                        const row = rows[item.index]
                                        const group = row.group
                                        const state = selection.get(group.key)!
                                        return (
                                            <div
                                                key={item.key}
                                                data-index={item.index}
                                                ref={virtualizer.measureElement}
                                                className="absolute top-0 left-0 w-full pb-4"
                                            >
                                                {row.kind === 'header' ? (
                                                    <ModelProviderHeader
                                                        group={group}
                                                        first={row.first}
                                                        count={state.count}
                                                        all={state.all}
                                                        onFetch={
                                                            onFetchProvider
                                                        }
                                                        onSelect={
                                                            onSelectProvider
                                                        }
                                                    />
                                                ) : (
                                                    <ModelGridRow
                                                        models={row.models}
                                                        columns={columns}
                                                        selected={selected}
                                                        reordering={reordering}
                                                        getModelStats={
                                                            getModelStats
                                                        }
                                                        {...actions}
                                                    />
                                                )}
                                            </div>
                                        )
                                    })}
                                </section>
                            ))}
                        </div>
                    </SortableContext>
                    <DragOverlay dropAnimation={null}>
                        {activeModel ? (
                            <ModelCard
                                model={activeModel}
                                isActive={selected.has(activeModel.id)}
                                {...getModelStats(activeModel)}
                                {...actions}
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    )
}
