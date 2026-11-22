import asyncio
from collections.abc import Awaitable, Callable, Sequence
from typing import TypeVar

T = TypeVar("T")
R = TypeVar("R")


async def run_batch(
    items: Sequence[T],
    call_and_validate: Callable[[T], Awaitable[R]],
    concurrency: int = 8,
) -> list[R]:
    if not 1 <= concurrency <= 8:
        raise ValueError("concurrency must be between 1 and 8")
    if not items:
        return []

    # reject invalid requests before spending on parallel calls.
    results = {0: await call_and_validate(items[0])}
    remaining = iter(enumerate(items[1:], start=1))

    async def worker() -> None:
        for index, item in remaining:
            results[index] = await call_and_validate(item)

    async with asyncio.TaskGroup() as group:
        for _ in range(min(concurrency, len(items) - 1)):
            group.create_task(worker())

    return [results[index] for index in range(len(items))]
