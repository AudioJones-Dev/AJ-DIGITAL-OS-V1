let isLocalProviderWarmedUp = false;

export function getLocalProviderWarmedUp(): boolean {
  return isLocalProviderWarmedUp;
}

export function setLocalProviderWarmedUp(value: boolean): void {
  isLocalProviderWarmedUp = value;
}
