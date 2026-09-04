# Wake every Render free-tier service before a demo.
#
# Render spins free instances down after ~15 minutes of inactivity, and these
# Spring Boot services take ~90s to cold start on a 0.1 CPU instance. If a
# request arrives through api-gateway while a backend is still asleep, the
# gateway gives up waiting and returns 502 - which is what a "broken" demo
# looks like. Run this ~3 minutes before demoing and everything responds
# normally.
#
# Usage (from the repo root):  powershell -ExecutionPolicy Bypass -File scripts\warm-up.ps1

$services = @(
    "https://user-service-lk57.onrender.com/actuator/health"
    "https://restaurant-service-c30t.onrender.com/actuator/health"
    "https://food-catalogue-service.onrender.com/actuator/health"
    "https://order-service-aq1v.onrender.com/actuator/health"
    "https://delivery-service-gxjo.onrender.com/actuator/health"
    "https://api-gateway-3nle.onrender.com/actuator/health"
    "https://food-delivery-ui-n8c3.onrender.com/"
    "https://partner-app-65z2.onrender.com/"
    "https://delivery-app-csdw.onrender.com/"
)

Write-Host "Warming $($services.Count) services (cold starts take up to ~2 min each)..."

# Fire them all off in parallel so the cold starts overlap instead of stacking.
$jobs = foreach ($url in $services) {
    Start-Job -ArgumentList $url -ScriptBlock {
        param($url)
        try {
            $response = Invoke-WebRequest -Uri $url -TimeoutSec 300 -UseBasicParsing
            [PSCustomObject]@{ Url = $url; Status = $response.StatusCode }
        } catch {
            $code = "failed"
            if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
            [PSCustomObject]@{ Url = $url; Status = $code }
        }
    }
}

$jobs | Wait-Job | Out-Null

foreach ($result in ($jobs | Receive-Job)) {
    $shortUrl = $result.Url -replace '^https://', ''
    Write-Host ("  {0,-60} {1}" -f $shortUrl, $result.Status)
}

$jobs | Remove-Job

Write-Host "Done. All services should now be warm for ~15 minutes of inactivity."
